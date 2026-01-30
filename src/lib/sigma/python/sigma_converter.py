"""
Sigma rule converter running inside Pyodide (browser WASM).
Adapted from detection.studio (github.com/northsh/detection.studio).

Patches CSafeLoader/CDumper (C extensions unavailable in WASM)
and mocks MITRE ATT&CK data loading (urllib unavailable in WASM).
"""

import json
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
from sigma.exceptions import SigmaError
from sigma.plugins import InstalledSigmaPlugins
from sigma.processing.pipeline import ProcessingPipeline
from sigma.processing.resolver import ProcessingPipelineResolver
from sigma.rule import SigmaRule

# Discover plugins at module level
plugins = InstalledSigmaPlugins.autodiscover()
backends = plugins.backends


def get_available_pipelines(backend=""):
    """Get available pipeline info, optionally filtered by backend compatibility."""
    try:
        available_pipelines = ProcessingPipelineResolver(
            InstalledSigmaPlugins.autodiscover().pipelines
        ).list_pipelines()

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
