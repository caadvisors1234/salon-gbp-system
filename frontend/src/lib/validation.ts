export type ValidationResult = string | null;
export type Validator = (value: string) => ValidationResult;

export function required(label: string): Validator {
  return (v) => (v.trim() ? null : `${label}は必須です`);
}

export function email(): Validator {
  return (v) => {
    if (!v) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "メールアドレスの形式が正しくありません";
  };
}

export function url(): Validator {
  return (v) => {
    if (!v) return null;
    try {
      new URL(v);
      return null;
    } catch {
      return "URLの形式が正しくありません";
    }
  };
}

export function uuid(): Validator {
  return (v) => {
    if (!v) return null;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
      ? null
      : "UUIDの形式が正しくありません";
  };
}

export function slug(): Validator {
  return (v) => {
    if (!v) return null;
    return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v)
      ? null
      : "英小文字・数字・ハイフンのみ使用できます";
  };
}

export function minLength(min: number): Validator {
  return (v) => {
    if (!v) return null;
    return v.length >= min ? null : `${min}文字以上で入力してください`;
  };
}

export function maxLength(max: number): Validator {
  return (v) => (v.length > max ? `${max}文字以内で入力してください` : null);
}

export function pattern(re: RegExp, msg: string): Validator {
  return (v) => {
    if (!v) return null;
    return re.test(v) ? null : msg;
  };
}

export function hotpepperUrl(): Validator {
  return (v) => {
    if (!v) return null;
    return /^https?:\/\/beauty\.hotpepper\.jp\/slnH[a-zA-Z0-9]+/.test(v)
      ? null
      : "https://beauty.hotpepper.jp/slnH... の形式で入力してください";
  };
}

export function validate(value: string, ...validators: Validator[]): ValidationResult {
  for (const v of validators) {
    const result = v(value);
    if (result) return result;
  }
  return null;
}

export function validateForm<T extends Record<string, string>>(
  values: T,
  rules: Partial<Record<keyof T, Validator[]>>,
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const key of Object.keys(rules) as (keyof T)[]) {
    const validators = rules[key];
    if (!validators) continue;
    const result = validate(values[key] ?? "", ...validators);
    if (result) errors[key] = result;
  }
  return errors;
}
