import type { ProductOption, ProductVariant } from "~/storefront.types";
import styles from "./VariantSelector.module.css";

interface VariantSelectorProps {
  options: ProductOption[];
  selectedOptions: Record<string, string>;
  variants: ProductVariant[];
  onOptionChange: (optionName: string, value: string) => void;
}

export function VariantSelector({
  options,
  selectedOptions,
  variants,
  onOptionChange,
}: VariantSelectorProps) {
  // Check if a specific option value is available (has at least one available variant)
  const isOptionValueAvailable = (
    optionName: string,
    optionValue: string
  ): boolean => {
    // Build the hypothetical selected options with this value
    const testOptions = { ...selectedOptions, [optionName]: optionValue };

    // Check if any variant matches these options and is available
    return variants.some((variant) => {
      const matches = variant.selectedOptions.every(
        (opt) => testOptions[opt.name] === opt.value
      );
      return matches && variant.availableForSale;
    });
  };

  return (
    <div className={styles.container}>
      {options.map((option) => (
        <div key={option.id} className={styles.optionGroup}>
          <label className={styles.label}>{option.name}</label>
          <div className={styles.values}>
            {option.values.map((value) => {
              const isSelected = selectedOptions[option.name] === value;
              const isAvailable = isOptionValueAvailable(option.name, value);

              return (
                <button
                  key={value}
                  type="button"
                  className={`${styles.optionButton} ${
                    isSelected ? styles.selected : ""
                  } ${!isAvailable ? styles.unavailable : ""}`}
                  onClick={() => onOptionChange(option.name, value)}
                  disabled={!isAvailable}
                  title={!isAvailable ? "Out of stock" : undefined}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
