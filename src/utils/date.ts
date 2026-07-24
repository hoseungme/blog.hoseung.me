import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";

export function formatKST(timestamp: number, formatString: string) {
  return format(new TZDate(timestamp, "+09:00"), formatString);
}
