import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

export function formatUTC(timestamp: number, formatString: string) {
  return format(new TZDate(timestamp, "+00:00"), formatString);
}
