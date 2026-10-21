"""
Sigma rule converter running inside Pyodide (browser WASM).
Adapted from detection.studio (github.com/northsh/detection.studio).

Patches CSafeLoader/CDumper (C extensions unavailable in WASM)
and mocks MITRE ATT&CK data loading (urllib unavailable in WASM).
"""

import json
import re
from dataclasses import fields as dataclass_fields
from importlib import import_module
from inspect import isclass
from typing import Any, Dict, List, Optional, Union

import yaml

# Patch: alias C extensions to pure-Python equivalents
if not hasattr(yaml, "CSafeLoader"):
    yaml.CSafeLoader = yaml.SafeLoader
if not hasattr(yaml, "CDumper"):
    yaml.CDumper = yaml.Dumper

# Mock MITRE ATT&CK data loading BEFORE importing sigma plugins.
# The elasticsearch backend tries to load MITRE ATT&CK data via urllib
# which is unavailable in Pyodide.
import sigma.data.mitre_attack

def _mock_load_mitre_attack_data():
    return {
        "techniques": {},
        "tactics": {},
        "groups": {},
        "software": {},
    }

sigma.data.mitre_attack._load_mitre_attack_data = _mock_load_mitre_attack_data
sigma.data.mitre_attack._cached_data = None

# Create module-level attributes that backends try to import
sigma.data.mitre_attack.mitre_attack_tactics = {}
sigma.data.mitre_attack.mitre_attack_techniques = {}
sigma.data.mitre_attack.mitre_attack_groups = {}
sigma.data.mitre_attack.mitre_attack_software = {}

from sigma.collection import SigmaCollection
from sigma.conversion.base import Backend
from sigma.exceptions import SigmaConditionError, SigmaError
from sigma.plugins import InstalledSigmaPlugins
from sigma.processing.pipeline import ProcessingPipeline
from sigma.processing.resolver import ProcessingPipelineResolver
from sigma.rule import SigmaRule
from sigma.validators.base import SigmaValidationIssue

plugins = InstalledSigmaPlugins.autodiscover()
backends = plugins.backends


def refresh_plugins():
    global plugins, backends
    plugins = InstalledSigmaPlugins.autodiscover()
    backends = plugins.backends


def get_available_pipelines(backend=""):
    """Get available pipeline info, optionally filtered by backend compatibility."""
    try:
        available_pipelines = ProcessingPipelineResolver(plugins.pipelines).list_pipelines()

        results = []
        for name, pipeline in available_pipelines:
            if backend and pipeline.allowed_backends and backend not in pipeline.allowed_backends:
                continue
            results.append({
                "name": name,
                "description": getattr(pipeline, "name", name),
            })
        return results
    except Exception:
        return []


def convert_rule(
    rule_yaml,
    target,
    pipeline_names=None,
    pipeline_ymls=None,
    filter_yml=None,
    output_format="default",
    correlation_method=None,
    backend_options=None,
    skip_unsupported=False,
):
    """Convert a Sigma rule YAML string to a target query language.

    Args:
        rule_yaml: The Sigma rule as a YAML string
        target: Backend identifier (autodiscovery key, e.g. 'splunk', 'log_scale')
        pipeline_names: List of built-in pipeline names to apply
        pipeline_ymls: List of custom pipeline YAML strings
        filter_yml: Optional filter YAML string
        output_format: Output format name (default: 'default')
        correlation_method: Optional correlation method name
        backend_options: Optional dict of backend-specific options
        skip_unsupported: Skip rules that can't be handled by the backend

    Returns:
        The converted rule output
    """
    if pipeline_names is None:
        pipeline_names = []
    if pipeline_ymls is None:
        pipeline_ymls = []
    if backend_options is None:
        backend_options = {}

    # Apply filter if provided
    if filter_yml:
        try:
            rule_yaml = filter_yml + "\n---\n" + rule_yaml
            rule_collection = SigmaCollection.from_yaml(rule_yaml)
        except Exception as e:
            raise SigmaError(f"Filter processing error: {str(e)}")
    else:
        rule_collection = SigmaCollection.from_yaml(rule_yaml)

    # Build processing pipeline from named pipelines
    processing_pipeline = None

    if pipeline_names and len(pipeline_names) > 0:
        try:
            if isinstance(pipeline_names, str):
                pipeline_names = [pipeline_names]
            pipeline_resolver = ProcessingPipelineResolver(plugins.pipelines)
            processing_pipeline = pipeline_resolver.resolve(pipeline_names)
        except Exception as e:
            raise SigmaError(f"Error loading pipelines {pipeline_names}: {str(e)}")

    # Add custom pipelines from YAML
    if pipeline_ymls and len(pipeline_ymls) > 0:
        try:
            for pipeline_yml in pipeline_ymls:
                if pipeline_yml:
                    custom_pipeline = ProcessingPipeline.from_yaml(pipeline_yml)
                    if processing_pipeline is None:
                        processing_pipeline = custom_pipeline
                    else:
                        processing_pipeline = processing_pipeline + custom_pipeline
        except Exception as e:
            raise SigmaError(f"Error processing custom pipeline: {str(e)}")

    # Resolve backend class
    try:
        backend_class = backends[target]
    except KeyError:
        raise SigmaError(
            f"Backend '{target}' is not installed or does not exist. "
            f"Available: {list(backends.keys())}"
        )

    final_pipeline = processing_pipeline

    try:
        backend_kwargs = {"collect_errors": skip_unsupported, **backend_options}
        if final_pipeline is not None:
            backend_kwargs["processing_pipeline"] = final_pipeline
        backend_instance: Backend = backend_class(**backend_kwargs)
    except TypeError as e:
        param = str(e).split("'")[1]
        raise SigmaError(f"Parameter '{param}' is not supported by backend '{target}'.")

    # Validate output format
    if output_format not in backend_class.formats.keys():
        raise SigmaError(
            f"Output format '{output_format}' is not supported by backend '{target}'."
        )

    # Validate correlation method
    if correlation_method is not None:
        correlation_methods = backend_instance.correlation_methods
        if correlation_methods is None:
            raise SigmaError(f"Backend '{target}' does not support correlations.")
        elif correlation_method not in correlation_methods.keys():
            raise SigmaError(
                f"Correlation method '{correlation_method}' is not supported by backend '{target}'."
            )

    # Convert
    result = backend_instance.convert(rule_collection, output_format, correlation_method)

    # Process errors
    if backend_instance.errors and not skip_unsupported:
        error_list = [
            f"{str(rule.source)}: {str(error)}"
            for rule, error in backend_instance.errors
        ]
        if error_list:
            raise SigmaError("\n".join(error_list))

    # Format result
    if isinstance(result, str):
        return result
    elif isinstance(result, list) and all(isinstance(item, str) for item in result):
        return "\n\n".join(result)
    elif isinstance(result, (list, dict, bytes)):
        return result
    else:
        return str(result)


VALIDATORS_NEEDING_FILENAME = {
    "duplicate_filename",
    "filename_length",
    "sigmahq_filename_convention",
    "sigmahq_filename_prefix",
    "sigmahq_correlation_filename_prefix",
}
VALIDATORS_NEEDING_MITRE_DATA = {
    "attacktag",
    "d3_fendtag",
    "sigmahq_tags_techniques_without_tactics",
}
VALIDATORS_NEEDING_RULESET = {
    "duplicate_references",
    "duplicate_title",
    "identifier_uniqueness",
}
EXCLUDED_VALIDATORS = (
    VALIDATORS_NEEDING_FILENAME | VALIDATORS_NEEDING_MITRE_DATA | VALIDATORS_NEEDING_RULESET
)
ISSUE_BASE_FIELDS = {"rules", "severity", "description"}


def load_sigmahq_validator_data(json_by_module):
    from sigma.validators.sigmahq.data.base import SigmahqDataLoader

    for module_name, json_text in json_by_module.items():
        module = import_module(f"sigma.validators.sigmahq.data.{module_name}")
        loader_class = next(
            value
            for value in vars(module).values()
            if isclass(value)
            and issubclass(value, SigmahqDataLoader)
            and value is not SigmahqDataLoader
        )
        for name, value in loader_class()._parse(json.loads(json_text)).items():
            setattr(module, name, value)


def _to_plain_value(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (list, tuple, set)):
        return [_to_plain_value(item) for item in value]
    return str(value)


def _issue_details(issue: SigmaValidationIssue):
    return {
        field.name: _to_plain_value(getattr(issue, field.name))
        for field in dataclass_fields(issue)
        if field.name not in ISSUE_BASE_FIELDS
    }


def _parse_error_to_check(error):
    source = getattr(error, "source", None)
    message = error.args[0] if error.args else str(error)
    return {
        "code": type(error).__name__,
        "severity": "error",
        "message": str(message),
        "details": {},
        "line": getattr(source, "line", None),
    }


def _issue_to_check(issue: SigmaValidationIssue):
    return {
        "code": type(issue).__name__,
        "severity": issue.severity.name.lower(),
        "message": issue.description,
        "details": _issue_details(issue),
        "line": None,
    }


CONDITION_KEYWORDS = {"and", "or", "not", "of", "all", "them"}
CONDITION_IDENTIFIER_PATTERN = re.compile(r"[A-Za-z_][\w*]*")


def _undefined_condition_identifiers(condition_text, detection_names):
    undefined = []
    for identifier in CONDITION_IDENTIFIER_PATTERN.findall(condition_text):
        if identifier.lower() in CONDITION_KEYWORDS:
            continue
        identifier_regex = re.compile("^" + re.escape(identifier).replace(r"\*", ".*") + "$")
        if not any(identifier_regex.match(name) for name in detection_names):
            undefined.append(identifier)
    return undefined


def _condition_errors(rule):
    detection = getattr(rule, "detection", None)
    if detection is None:
        return []
    detection_names = list(detection.detections.keys())
    errors = []
    for condition in detection.parsed_condition:
        undefined = _undefined_condition_identifiers(condition.condition, detection_names)
        if undefined:
            errors.extend(
                SigmaConditionError(
                    f"Condition uses '{identifier}', but no detection has this name"
                )
                for identifier in undefined
            )
            continue
        try:
            condition.parse()
        except SigmaError as error:
            errors.append(error)
        except Exception as error:
            errors.append(
                SigmaConditionError(f"Condition '{condition.condition}' is not valid: {error}")
            )
    return errors


def _collect_parse_errors(collection):
    errors = list(collection.errors)
    for rule in collection.rules:
        errors.extend(getattr(rule, "errors", []))
        errors.extend(_condition_errors(rule))
    unique_checks = {}
    for error in errors:
        check = _parse_error_to_check(error)
        unique_checks[(check["code"], check["message"])] = check
    return list(unique_checks.values())


def _run_validators(rules):
    validator_classes = plugins.validators
    validators = [
        validator_class()
        for name, validator_class in validator_classes.items()
        if name not in EXCLUDED_VALIDATORS
    ]
    issues = []
    for validator in validators:
        try:
            for rule in rules:
                issues.extend(validator.validate(rule))
            issues.extend(validator.finalize())
        except Exception:
            continue
    return issues


def validate_rule(rule_yaml):
    try:
        collection = SigmaCollection.from_yaml(rule_yaml, collect_errors=True)
    except Exception as error:
        return [_parse_error_to_check(error)]
    parse_checks = _collect_parse_errors(collection)
    if parse_checks:
        return parse_checks
    return [_issue_to_check(issue) for issue in _run_validators(collection.rules)]
