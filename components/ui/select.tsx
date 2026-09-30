type SelectFieldProps = {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  errors?: string[];
  // A disabled select isn't submitted, so its field reads as empty.
  disabled?: boolean;
  hint?: string;
};

export function SelectField({
  label,
  name,
  options,
  required = true,
  defaultValue = "",
  placeholder = "Select…",
  errors,
  disabled = false,
  hint,
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium text-sumi-soft">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        aria-invalid={errors && errors.length > 0}
        defaultValue={defaultValue}
        disabled={disabled}
        className="rounded-lg border border-sumi/15 bg-washi px-4 py-2.5 text-sumi outline-none transition focus:border-ai focus:ring-2 focus:ring-ai-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-sumi-soft">{hint}</p>}
      {errors?.map((error) => (
        <p key={error} className="text-sm text-shu">
          {error}
        </p>
      ))}
    </div>
  );
}
