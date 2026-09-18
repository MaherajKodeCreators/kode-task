import { type InputHTMLAttributes, type SelectHTMLAttributes, forwardRef, useState } from 'react'

type FieldWrapperProps = {
  label: string
  error?: string
  children: React.ReactNode
  htmlFor?: string
}

export function FieldWrapper({ label, error, children, htmlFor }: FieldWrapperProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

const inputClasses =
  'block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:bg-slate-50 disabled:text-slate-500'

type InputFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { label, error, id, className = '', ...props },
  ref
) {
  const fieldId = id ?? props.name
  return (
    <FieldWrapper label={label} error={error} htmlFor={fieldId}>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        className={`${inputClasses} ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...props}
      />
    </FieldWrapper>
  )
})

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      {off ? (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.5A10.4 10.4 0 0112 5c5 0 9 4 10.5 7-.6 1.2-1.5 2.5-2.7 3.6M6.3 6.7C4.4 8 3 9.8 1.5 12c1.7 3.3 5 7 10.5 7 1.3 0 2.5-.2 3.6-.6"
          />
        </>
      ) : (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"
          />
          <circle cx="12" cy="12" r="2.5" />
        </>
      )}
    </svg>
  )
}

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
  error?: string
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { label, error, id, className = '', ...props },
  ref
) {
  const [visible, setVisible] = useState(false)
  const fieldId = id ?? props.name
  return (
    <FieldWrapper label={label} error={error} htmlFor={fieldId}>
      <div className="relative">
        <input
          ref={ref}
          id={fieldId}
          type={visible ? 'text' : 'password'}
          aria-invalid={!!error}
          className={`${inputClasses} pr-10 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-slate-400 hover:text-slate-600"
        >
          <EyeIcon off={visible} />
        </button>
      </div>
    </FieldWrapper>
  )
})

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  error?: string
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, error, id, className = '', children, ...props },
  ref
) {
  const fieldId = id ?? props.name
  return (
    <FieldWrapper label={label} error={error} htmlFor={fieldId}>
      <select
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        className={`${inputClasses} ${error ? 'border-red-400' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  )
})
