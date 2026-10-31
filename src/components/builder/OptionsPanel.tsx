import { useState } from "react";

import type {
  ContainerType,
  KapeConfig,
  TransferType,
} from "../../lib/builder/config";
import { Panel } from "../ui/Panel";

type ConfigPatch = Partial<KapeConfig>;
type OptionsTab =
  | "collection"
  | "processing"
  | "package"
  | "transfer"
  | "advanced";

interface OptionsPanelProps {
  config: KapeConfig;
  exportFormats: string[];
  onChange: (patch: ConfigPatch) => void;
}

const TABS: { id: OptionsTab; label: string }[] = [
  { id: "collection", label: "Collection" },
  { id: "processing", label: "Processing" },
  { id: "package", label: "Package" },
  { id: "transfer", label: "Transfer" },
  { id: "advanced", label: "Advanced" },
];

const inputClassName =
  "h-8 w-full rounded-lg border border-border bg-background px-2.5 font-mono text-xs outline-none focus:border-primary/50 disabled:opacity-50";

function FieldLabel({
  id,
  label,
  flag,
}: {
  id: string;
  label: string;
  flag?: string;
}) {
  return (
    <label
      className="mb-1 flex items-baseline justify-between gap-2 text-xs"
      htmlFor={id}
    >
      <span className="text-muted-foreground">{label}</span>
      {flag && (
        <code className="font-mono text-[11px] text-muted-foreground">
          {flag}
        </code>
      )}
    </label>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  flag?: string;
  secret?: boolean;
  disabled?: boolean;
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  flag,
  secret = false,
  disabled = false,
}: TextFieldProps) {
  return (
    <div className="min-w-0">
      <FieldLabel flag={flag} id={id} label={label} />
      <input
        autoComplete="off"
        className={inputClassName}
        disabled={disabled}
        id={id}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        type={secret ? "password" : "text"}
        value={value}
      />
      {hint && (
        <p className="mt-1 text-[11px] text-muted-foreground/80">{hint}</p>
      )}
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  flag?: string;
  disabled?: boolean;
}

function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  flag,
  disabled = false,
}: SelectFieldProps<T>) {
  return (
    <div className="min-w-0">
      <FieldLabel flag={flag} id={id} label={label} />
      <select
        className={inputClassName}
        disabled={disabled}
        id={id}
        onChange={(event) =>
          onChange(
            options.find((option) => option.value === event.target.value)
              ?.value ?? value
          )
        }
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface CheckboxFieldProps {
  flag: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function CheckboxField({
  flag,
  label,
  checked,
  onChange,
  disabled = false,
}: CheckboxFieldProps) {
  return (
    <label
      className={`flex items-start gap-2 text-xs ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <input
        checked={checked}
        className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span className="flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-foreground">{label}</span>
        <code className="font-mono text-[11px] text-muted-foreground">
          {flag}
        </code>
      </span>
    </label>
  );
}

function TabNote({ children }: { children: string }) {
  return <p className="mb-3 text-muted-foreground text-xs">{children}</p>;
}

const CONTAINER_OPTIONS: { value: ContainerType; label: string }[] = [
  { label: "No container", value: "none" },
  { label: "VHDX", value: "vhdx" },
  { label: "VHD", value: "vhd" },
  { label: "ZIP", value: "zip" },
];

const TRANSFER_OPTIONS: { value: TransferType; label: string }[] = [
  { label: "None", value: "none" },
  { label: "SFTP server", value: "sftp" },
  { label: "S3 bucket (keys)", value: "s3" },
  { label: "S3 pre-signed URL", value: "s3url" },
  { label: "Azure Blob (SAS URI)", value: "azure" },
];

function TransferFields({
  config,
  onChange,
}: Omit<OptionsPanelProps, "exportFormats">) {
  switch (config.transfer) {
    case "sftp": {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            flag="--scs"
            id="opt-scs"
            label="Server"
            onChange={(sftpServer) => onChange({ sftpServer })}
            placeholder="sftp.example.com"
            value={config.sftpServer}
          />
          <TextField
            flag="--scp"
            id="opt-scp"
            label="Port"
            onChange={(sftpPort) => onChange({ sftpPort })}
            placeholder="22"
            value={config.sftpPort}
          />
          <TextField
            flag="--scu"
            id="opt-scu"
            label="User"
            onChange={(sftpUser) => onChange({ sftpUser })}
            value={config.sftpUser}
          />
          <TextField
            flag="--scpw"
            id="opt-scpw"
            label="Password"
            onChange={(sftpPassword) => onChange({ sftpPassword })}
            secret
            value={config.sftpPassword}
          />
          <div className="sm:col-span-2">
            <TextField
              flag="--scd"
              hint="No leading slash."
              id="opt-scd"
              label="Directory"
              onChange={(sftpDirectory) => onChange({ sftpDirectory })}
              placeholder="cases/2026-001"
              value={config.sftpDirectory}
            />
          </div>
        </div>
      );
    }
    case "s3": {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            flag="--s3p"
            id="opt-s3p"
            label="Provider"
            onChange={(s3Provider) => onChange({ s3Provider })}
            value={config.s3Provider}
          />
          <TextField
            flag="--s3r"
            id="opt-s3r"
            label="Region"
            onChange={(s3Region) => onChange({ s3Region })}
            placeholder="eu-west-1"
            value={config.s3Region}
          />
          <TextField
            flag="--s3b"
            id="opt-s3b"
            label="Bucket"
            onChange={(s3Bucket) => onChange({ s3Bucket })}
            value={config.s3Bucket}
          />
          <TextField
            flag="--s3kp"
            id="opt-s3kp"
            label="Key prefix"
            onChange={(s3KeyPrefix) => onChange({ s3KeyPrefix })}
            placeholder="CASE-001/%m"
            value={config.s3KeyPrefix}
          />
          <TextField
            flag="--s3k"
            id="opt-s3k"
            label="Access key"
            onChange={(s3AccessKey) => onChange({ s3AccessKey })}
            secret
            value={config.s3AccessKey}
          />
          <TextField
            flag="--s3s"
            id="opt-s3s"
            label="Secret"
            onChange={(s3Secret) => onChange({ s3Secret })}
            secret
            value={config.s3Secret}
          />
          <div className="sm:col-span-2">
            <TextField
              flag="--s3st"
              hint="Temporary credentials only."
              id="opt-s3st"
              label="Session token"
              onChange={(s3SessionToken) => onChange({ s3SessionToken })}
              secret
              value={config.s3SessionToken}
            />
          </div>
        </div>
      );
    }
    case "s3url": {
      return (
        <TextField
          flag="--s3url"
          hint="A PUT URL. No other S3 switches are used."
          id="opt-s3url"
          label="Pre-signed URL"
          onChange={(s3Url) => onChange({ s3Url })}
          secret
          value={config.s3Url}
        />
      );
    }
    case "azure": {
      return (
        <TextField
          flag="--asu"
          hint="Container SAS with write access."
          id="opt-asu"
          label="SAS URI"
          onChange={(azureSasUri) => onChange({ azureSasUri })}
          secret
          value={config.azureSasUri}
        />
      );
    }
    default: {
      return null;
    }
  }
}

function CollectionTab({
  config,
  hasTargets,
  onChange,
}: Pick<OptionsPanelProps, "config" | "onChange"> & {
  hasTargets: boolean;
}) {
  return (
    <div>
      {!hasTargets && (
        <TabNote>Select a target to edit collection options.</TabNote>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          disabled={!hasTargets}
          flag="--tsource"
          id="opt-tsource"
          label="Source"
          onChange={(tsource) => onChange({ tsource })}
          placeholder="C:"
          value={config.tsource}
        />
        <TextField
          disabled={!hasTargets}
          flag="--tdest"
          hint="%m = host · %d = date"
          id="opt-tdest"
          label="Destination"
          onChange={(tdest) => onChange({ tdest })}
          placeholder={"D:\\KAPE\\%m\\Targets"}
          value={config.tdest}
        />
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <CheckboxField
          checked={config.vss}
          disabled={!hasTargets}
          flag="--vss"
          label="Search Volume Shadow Copies"
          onChange={(vss) => onChange({ vss })}
        />
        <CheckboxField
          checked={config.deduplicate}
          disabled={!hasTargets}
          flag="--tdd"
          label="Skip duplicate files (SHA-1)"
          onChange={(deduplicate) => onChange({ deduplicate })}
        />
        <CheckboxField
          checked={config.tflush}
          disabled={!hasTargets}
          flag="--tflush"
          label="Clear destination first"
          onChange={(tflush) => onChange({ tflush })}
        />
      </div>
    </div>
  );
}

function ProcessingTab({
  config,
  hasModules,
  exportFormats,
  onChange,
}: Pick<OptionsPanelProps, "config" | "onChange" | "exportFormats"> & {
  hasModules: boolean;
}) {
  return (
    <div>
      {!hasModules && (
        <TabNote>Select a module to edit processing options.</TabNote>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          disabled={!hasModules}
          flag="--msource"
          id="opt-msource"
          label="Module source"
          onChange={(msource) => onChange({ msource })}
          placeholder="Uses --tdest"
          value={config.msource}
        />
        <TextField
          disabled={!hasModules}
          flag="--mdest"
          id="opt-mdest"
          label="Module destination"
          onChange={(mdest) => onChange({ mdest })}
          placeholder={"D:\\KAPE\\%m\\Modules"}
          value={config.mdest}
        />
        <SelectField
          disabled={!hasModules}
          flag="--mef"
          id="opt-mef"
          label="Export format"
          onChange={(exportFormat) => onChange({ exportFormat })}
          options={[
            { label: "Module default", value: "" },
            ...exportFormats.map((format) => ({
              label: format,
              value: format,
            })),
          ]}
          value={
            exportFormats.includes(config.exportFormat)
              ? config.exportFormat
              : ""
          }
        />
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <CheckboxField
          checked={config.zipModules}
          disabled={!hasModules}
          flag="--zm"
          label="Zip module output"
          onChange={(zipModules) => onChange({ zipModules })}
        />
        <CheckboxField
          checked={config.mflush}
          disabled={!hasModules}
          flag="--mflush"
          label="Clear module destination first"
          onChange={(mflush) => onChange({ mflush })}
        />
      </div>
    </div>
  );
}

function PackageTab({
  config,
  hasTargets,
  onChange,
}: Pick<OptionsPanelProps, "config" | "onChange"> & {
  hasTargets: boolean;
}) {
  const isVirtualDisk =
    config.container === "vhdx" || config.container === "vhd";
  return (
    <div>
      {!hasTargets && (
        <TabNote>Select a target to package the collection.</TabNote>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          disabled={!hasTargets}
          id="opt-container"
          label="Container"
          onChange={(container) => onChange({ container })}
          options={CONTAINER_OPTIONS}
          value={config.container}
        />
        <TextField
          disabled={!hasTargets || config.container === "none"}
          id="opt-container-name"
          label="Base name"
          onChange={(containerName) => onChange({ containerName })}
          placeholder="evidence"
          value={config.containerName}
        />
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <CheckboxField
          checked={config.zipContainer}
          disabled={!(hasTargets && isVirtualDisk)}
          flag="--zv"
          label="Zip the VHD(X)"
          onChange={(zipContainer) => onChange({ zipContainer })}
        />
      </div>
      <div className="mt-3 sm:max-w-xs">
        <TextField
          flag="--zpw"
          hint="Used for every zip output."
          id="opt-zpw"
          label="Zip password"
          onChange={(zipPassword) => onChange({ zipPassword })}
          secret
          value={config.zipPassword}
        />
      </div>
    </div>
  );
}

function TransferTab({
  config,
  onChange,
}: Pick<OptionsPanelProps, "config" | "onChange">) {
  return (
    <div>
      <div className="sm:max-w-sm">
        <SelectField
          id="opt-transfer"
          label="Upload to"
          onChange={(transfer) => onChange({ transfer })}
          options={TRANSFER_OPTIONS}
          value={config.transfer}
        />
      </div>

      {config.transfer === "none" ? (
        <p className="mt-3 text-muted-foreground text-xs">
          No upload. Files stay at the destination.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <TransferFields config={config} onChange={onChange} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              hint="Defaults to the host name."
              id="opt-comment"
              label="Comment"
              onChange={(transferComment) => onChange({ transferComment })}
              placeholder={config.caseId || "CASE-001"}
              value={config.transferComment}
            />
            <div className="flex items-end pb-1.5">
              <CheckboxField
                checked={config.keepLocalCopy}
                flag="--rlc"
                label="Keep the local copy after upload"
                onChange={(keepLocalCopy) => onChange({ keepLocalCopy })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdvancedTab({
  config,
  onChange,
}: Pick<OptionsPanelProps, "config" | "onChange">) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <h3 className="mb-2 font-medium text-xs text-muted-foreground">
          Case
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            id="opt-case"
            label="Case ID"
            onChange={(caseId) => onChange({ caseId })}
            placeholder="CASE-001"
            value={config.caseId}
          />
          <TextField
            id="opt-examiner"
            label="Examiner"
            onChange={(examiner) => onChange({ examiner })}
            value={config.examiner}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground/80">
          Written to collection-info.txt.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-xs text-muted-foreground">
          Run
        </h3>
        <div className="grid gap-2.5 sm:grid-cols-2">
          <CheckboxField
            checked={config.debug}
            flag="--debug"
            label="Debug log"
            onChange={(debug) => onChange({ debug })}
          />
          <CheckboxField
            checked={config.trace}
            flag="--trace"
            label="Trace log (slow)"
            onChange={(trace) => onChange({ trace })}
          />
          <CheckboxField
            checked={config.gui}
            flag="--gui"
            label="Keep window open"
            onChange={(gui) => onChange({ gui })}
          />
          <CheckboxField
            checked={config.linear}
            flag="--ul"
            label="Batch: one at a time"
            onChange={(linear) => onChange({ linear })}
          />
          <CheckboxField
            checked={config.cleanup}
            flag="--cu"
            label="Batch: clean up after"
            onChange={(cleanup) => onChange({ cleanup })}
          />
        </div>
      </div>
    </div>
  );
}

export function OptionsPanel({
  config,
  exportFormats,
  onChange,
}: OptionsPanelProps) {
  const [activeTab, setActiveTab] = useState<OptionsTab>("collection");
  const hasTargets = config.targets.length > 0;
  const hasModules = config.modules.length > 0;

  return (
    <Panel
      headingId="options-heading"
      title="Options"
      toolbar={
        <fieldset
          aria-label="Option groups"
          className="m-0 flex w-full flex-wrap gap-1 border-0 p-0"
        >
          {TABS.map((tab) => (
            <button
              aria-controls="options-panel"
              aria-pressed={activeTab === tab.id}
              className={`focus-ring h-8 shrink-0 rounded-md px-3 text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-overlay/[0.08] font-medium text-foreground"
                  : "text-muted-foreground hover:bg-overlay/[0.04] hover:text-foreground"
              }`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </fieldset>
      }
    >
      <div className="p-3 sm:p-4" id="options-panel">
        {activeTab === "collection" && (
          <CollectionTab
            config={config}
            hasTargets={hasTargets}
            onChange={onChange}
          />
        )}
        {activeTab === "processing" && (
          <ProcessingTab
            config={config}
            exportFormats={exportFormats}
            hasModules={hasModules}
            onChange={onChange}
          />
        )}
        {activeTab === "package" && (
          <PackageTab
            config={config}
            hasTargets={hasTargets}
            onChange={onChange}
          />
        )}
        {activeTab === "transfer" && (
          <TransferTab config={config} onChange={onChange} />
        )}
        {activeTab === "advanced" && (
          <AdvancedTab config={config} onChange={onChange} />
        )}
      </div>
    </Panel>
  );
}
