import { MagnifyingGlass, X } from "@phosphor-icons/react";

export function SearchInput({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <MagnifyingGlass
        size={17}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-10 pr-9"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 grid place-items-center w-6 h-6 rounded-md text-faint hover:text-ink hover:bg-surface-2 transition"
          aria-label="Clear search"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
