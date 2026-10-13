export function toUpperUnderscore(input: string): string {
  const words = input.trim().split(/\s+/);

  if (words.length > 1) {
    return words.join("_").toUpperCase();
  }

  return words[0].toUpperCase();
}

export const formatDuration = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const hLabel = hours === 1 ? "hour" : "hours";
  const mLabel = minutes === 1 ? "minute" : "minutes";

  if (hours > 0 && minutes > 0) {
    return `${hours} ${hLabel} ${minutes} ${mLabel}`;
  } else if (hours > 0) {
    return `${hours} ${hLabel}`;
  } else {
    return `${minutes} ${mLabel}`;
  }
};

export const FormatParticipants = (participants: number) => {
  if (participants === 0) {
    return "No participants added";
  } else if (participants === 1) {
    return `${participants} participant`;
  } else {
    return `${participants} participants`;
  }
};

export const formatCurrency = (
  amount: number,
  currency = "KES",
  locale = "en-KE",
) => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
};

// export const formatCurrency = (amount: number) =>
//   new Intl.NumberFormat("en-KE", {
//     style: "decimal",
//     minimumFractionDigits: 2,
//   }).format(amount);

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
