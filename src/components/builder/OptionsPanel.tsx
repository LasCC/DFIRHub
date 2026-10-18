import type { ReactNode } from "react";

import type {
  ContainerType,
  KapeConfig,
  TransferType,
} from "../../lib/builder/config";
import { Panel } from "../ui/Panel";

type ConfigPatch = Partial<KapeConfig>;

interface OptionsPanelProps {
  config: KapeConfig;
  exportFormats: string[];
  onChange: (patch: ConfigPatch) => void;
}

const inputClassName =
  "h-9 w-full rounded-lg border border-border bg-background px-3 font-mono text-xs outline-none focus:border-primary/50 disabled:opacity-50";

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
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
  secret = false,
  disabled = false,
}: TextFieldProps) {
  return (
    <div className="min-w-0">
      <label
        className="mb-1.5 block text-muted-foreground text-xs"
        htmlFor={id}
      >
        {label}
      </label>
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
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
}: SelectFieldProps<T>) {
  return (
    <div className="min-w-0">
      <label
        className="mb-1.5 block text-muted-foreground text-xs"
        htmlFor={id}
      >
        {label}
      </label>
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
      <span>
        <span className="font-mono text-foreground">{flag}</span>{" "}
        <span className="text-muted-foreground">{label}</span>
      </span>
    </label>
  );
}

interface OptionSectionProps {
  title: string;
  note?: string;
  children: ReactNode;
}

function OptionSection({ title, note, children }: OptionSectionProps) {
  return (
    <fieldset className="min-w-0 bg-background p-4">
      <legend className="float-left mb-3 w-full">
        <span className="font-medium text-sm">{title}</span>
        {note && (
          <span className="mt-0.5 block text-muted-foreground text-xs">
            {note}
          </span>
        )}
      </legend>
      <div className="clear-both space-y-3">{children}</div>
    </fieldset>
  );
}

const CONTAINER_OPTIONS: { value: ContainerType; label: string }[] = [
  { label: "None (plain folder)", value: "none" },
  { label: "VHDX (--vhdx)", value: "vhdx" },
  { label: "VHD (--vhd)", value: "vhd" },
  { label: "Zip (--zip)", value: "zip" },
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
            id="opt-scs"
            label="Server (--scs)"
            onChange={(sftpServer) => onChange({ sftpServer })}
            placeholder="sftp.example.com"
            value={config.sftpServer}
          />
          <TextField
            id="opt-scp"
            label="Port (--scp)"
            onChange={(sftpPort) => onChange({ sftpPort })}
            value={config.sftpPort}
          />
          <TextField
            id="opt-scu"
            label="User (--scu)"
            onChange={(sftpUser) => onChange({ sftpUser })}
            value={config.sftpUser}
          />
          <TextField
            id="opt-scpw"
            label="Password (--scpw)"
            onChange={(sftpPassword) => onChange({ sftpPassword })}
            secret
            value={config.sftpPassword}
          />
          <div className="sm:col-span-2">
            <TextField
              hint="No leading slash"
              id="opt-scd"
              label="Directory (--scd)"
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
            id="opt-s3p"
            label="Provider (--s3p)"
            onChange={(s3Provider) => onChange({ s3Provider })}
            value={config.s3Provider}
          />
          <TextField
            id="opt-s3r"
            label="Region (--s3r)"
            onChange={(s3Region) => onChange({ s3Region })}
            placeholder="eu-west-1"
            value={config.s3Region}
          />
          <TextField
            id="opt-s3b"
            label="Bucket (--s3b)"
            onChange={(s3Bucket) => onChange({ s3Bucket })}
            value={config.s3Bucket}
          />
          <TextField
            id="opt-s3kp"
            label="Key prefix (--s3kp)"
            onChange={(s3KeyPrefix) => onChange({ s3KeyPrefix })}
            placeholder="CASE-001/%m"
            value={config.s3KeyPrefix}
          />
          <TextField
            id="opt-s3k"
            label="Access key (--s3k)"
            onChange={(s3AccessKey) => onChange({ s3AccessKey })}
            secret
            value={config.s3AccessKey}
          />
          <TextField
            id="opt-s3s"
            label="Secret (--s3s)"
            onChange={(s3Secret) => onChange({ s3Secret })}
            secret
            value={config.s3Secret}
          />
          <div className="sm:col-span-2">
            <TextField
              hint="Only for temporary credentials"
              id="opt-s3st"
              label="Session token (--s3st)"
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
          hint="A PUT URL. KAPE needs no other S3 switch with it."
          id="opt-s3url"
          label="Pre-signed URL (--s3url)"
          onChange={(s3Url) => onChange({ s3Url })}
          secret
          value={config.s3Url}
        />
      );
    }
    case "azure": {
      return (
        <TextField
          hint="Generate the SAS on the container, with write access."
          id="opt-asu"
          label="SAS URI (--asu)"
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

export function OptionsPanel({
  config,
  exportFormats,
  onChange,
}: OptionsPanelProps) {
  const hasTargets = config.targets.length > 0;
  const hasModules = config.modules.length > 0;
  const isVirtualDisk =
    config.container === "vhdx" || config.container === "vhd";

  return (
    <Panel
      headingId="options-heading"
      subtitle="Every switch maps to a documented KAPE option"
      title="Options"
    >
      <div className="grid gap-px bg-border md:grid-cols-2">
        <OptionSection
          note={hasTargets ? undefined : "Pick targets to collect files."}
          title="Collection"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              disabled={!hasTargets}
              hint="Drive, folder or UNC path"
              id="opt-tsource"
              label="Source (--tsource)"
              onChange={(tsource) => onChange({ tsource })}
              value={config.tsource}
            />
            <TextField
              disabled={!hasTargets}
              hint="%m = host name, %d = timestamp"
              id="opt-tdest"
              label="Destination (--tdest)"
              onChange={(tdest) => onChange({ tdest })}
              value={config.tdest}
            />
          </div>
          <CheckboxField
            checked={config.vss}
            disabled={!hasTargets}
            flag="--vss"
            label="also search Volume Shadow Copies"
            onChange={(vss) => onChange({ vss })}
          />
          <CheckboxField
            checked={config.deduplicate}
            disabled={!hasTargets}
            flag="--tdd"
            label="skip duplicate files (SHA-1)"
            onChange={(deduplicate) => onChange({ deduplicate })}
          />
          <CheckboxField
            checked={config.tflush}
            disabled={!hasTargets}
            flag="--tflush"
            label="delete --tdest first"
            onChange={(tflush) => onChange({ tflush })}
          />
        </OptionSection>

        <OptionSection
          note={hasModules ? undefined : "Pick modules to parse the evidence."}
          title="Processing"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              disabled={!hasModules}
              hint={
                hasTargets ? "Empty = use --tdest" : "C:\\ for live response"
              }
              id="opt-msource"
              label="Module source (--msource)"
              onChange={(msource) => onChange({ msource })}
              placeholder={hasTargets ? "(--tdest)" : "C:\\"}
              value={config.msource}
            />
            <TextField
              disabled={!hasModules}
              hint="%m, %d and %s are allowed"
              id="opt-mdest"
              label="Module destination (--mdest)"
              onChange={(mdest) => onChange({ mdest })}
              value={config.mdest}
            />
          </div>
          <SelectField
            disabled={!hasModules}
            id="opt-mef"
            label="Export format (--mef)"
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
          <CheckboxField
            checked={config.zipModules}
            disabled={!hasModules}
            flag="--zm"
            label="zip the module output"
            onChange={(zipModules) => onChange({ zipModules })}
          />
          <CheckboxField
            checked={config.mflush}
            disabled={!hasModules}
            flag="--mflush"
            label="delete --mdest first"
            onChange={(mflush) => onChange({ mflush })}
          />
        </OptionSection>

        <OptionSection
          note="Package the collection for transport and integrity."
          title="Container"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              disabled={!hasTargets}
              id="opt-container"
              label="Type"
              onChange={(container) => onChange({ container })}
              options={CONTAINER_OPTIONS}
              value={config.container}
            />
            <TextField
              disabled={!hasTargets || config.container === "none"}
              hint="Base name, no extension"
              id="opt-container-name"
              label="Base name"
              onChange={(containerName) => onChange({ containerName })}
              value={config.containerName}
            />
          </div>
          <CheckboxField
            checked={config.zipContainer}
            disabled={!(hasTargets && isVirtualDisk)}
            flag="--zv"
            label="zip the VHD(X) (much smaller)"
            onChange={(zipContainer) => onChange({ zipContainer })}
          />
          <TextField
            hint="Used by --zip, --zv and --zm"
            id="opt-zpw"
            label="Zip password (--zpw)"
            onChange={(zipPassword) => onChange({ zipPassword })}
            secret
            value={config.zipPassword}
          />
        </OptionSection>

        <OptionSection
          note="Upload the container or zipped module output."
          title="Transfer"
        >
          <SelectField
            id="opt-transfer"
            label="Destination"
            onChange={(transfer) => onChange({ transfer })}
            options={TRANSFER_OPTIONS}
            value={config.transfer}
          />
          <TransferFields config={config} onChange={onChange} />
          {config.transfer !== "none" && (
            <>
              <TextField
                hint="Defaults to the host name"
                id="opt-comment"
                label="Transfer comment"
                onChange={(transferComment) => onChange({ transferComment })}
                placeholder={config.caseId || "CASE-001"}
                value={config.transferComment}
              />
              <CheckboxField
                checked={config.keepLocalCopy}
                flag="--rlc"
                label="keep the local copy after upload"
                onChange={(keepLocalCopy) => onChange({ keepLocalCopy })}
              />
            </>
          )}
        </OptionSection>

        <OptionSection
          note="Written to collection-info.txt by the scripts."
          title="Case"
        >
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
        </OptionSection>

        <OptionSection
          note="Logging, and _kape.cli batch behaviour."
          title="Run"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <CheckboxField
              checked={config.debug}
              flag="--debug"
              label="debug log"
              onChange={(debug) => onChange({ debug })}
            />
            <CheckboxField
              checked={config.trace}
              flag="--trace"
              label="trace log (slow)"
              onChange={(trace) => onChange({ trace })}
            />
            <CheckboxField
              checked={config.gui}
              flag="--gui"
              label="keep window open"
              onChange={(gui) => onChange({ gui })}
            />
            <CheckboxField
              checked={config.linear}
              flag="--ul"
              label="batch: one at a time"
              onChange={(linear) => onChange({ linear })}
            />
            <CheckboxField
              checked={config.cleanup}
              flag="--cu"
              label="batch: clean up after"
              onChange={(cleanup) => onChange({ cleanup })}
            />
          </div>
        </OptionSection>
      </div>
    </Panel>
  );
}
