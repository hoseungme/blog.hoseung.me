---
title: "How to represent and exchange date?"
date: 2023-03-24T00:00:00+09:00
description: "Make sure that everyone see the correct date"
thumbnail: ./thumbnail.png
locale: en
tags:
  - Front-end
  - Back-end
---

When creating products, there are many tasks related to managing dates.

- Time remaining until authentication expiration
- Time remaining until the end of an event
- And so on...

So handling these dates with external things, such as exchanging dates between a client and a server, becomes a common occurrence. What is the best way to represent and exchange dates?

First, let's explore the ISO 8601 standard, which contains the standard for representing dates and times, and UTC (Coordinated Universal Time), an international standard time.

## ISO 8601 Standard and UTC

UTC is the Coordinated Universal Time established in 1972, serving as the basis for time calculations worldwide.

Computers calculate time based on UTC and represent that time as data based on the [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601) standard.

The following examples represent time based on the ISO 8601 standard:

```plaintext
"2022-09-21"
"2022-09-21T12:00:00"
```

## How is the Difference from UTC Represented?

The difference between UTC and local time is called UTC offset. In the ISO 8601 standard, the UTC offset is represented in the following format:

```plaintext
"2022-09-21T12:00:00±[hh]:[mm]"
```

For instance, the time in Korea (KST) is 9 hours ahead of UTC, so `September 21, 2022, at 12:00 PM KST` can be represented as:

```plaintext
"2022-09-21T12:00:00+09:00"
```

The classification of UTC offsets by country/region (e.g. KST) is called **time zone**. We can use this time zone information to interpret dates according to local time.

## How Can UTC be Represented?

When representing UTC directly, always append either `Z` or UTC offset `+00:00` at the end:

```plaintext
"2022-09-21T12:00:00Z"
"2022-09-21T12:00:00+00:00"
```

Although they differ by only one character (Z), the following JavaScript code produces different results:

```tsx
// Fri May 06 2022 00:00:00 GMT+0900 (Korean Standard Time)
new Date("2022-09-21T00:00:00").toString();

// Fri May 06 2022 09:00:00 GMT+0900 (Korean Standard Time)
new Date("2022-09-21T00:00:00Z").toString();
```

Since `"2022-09-21T00:00:00"` lacks explicit specification that it is in UTC, it is automatically assumed to be in the local time zone (KST) during calculation.

On the other hand, `"2022-09-21T00:00:00Z"` explicitly specifies that it is in UTC, so when converted to the local time zone (KST), it adds 9 hours.

## Exchanging Dates with External Things

If you've read the explanations above, you've likely noticed that when exchanging dates with external things, it's important to **always specify the time zone**:

```plaintext
1. Specify UTC offset
"2022-09-21T12:00:00+09:00"

2. UTC ISO string
"2022-09-21T03:00:00Z"

3. Unix Timestamp
1663729200000
```

The Unix Timestamp represents the number of milliseconds that have elapsed since UTC midnight on January 1, 1970.

## What Happens If the Time Zone Is Not Specified?

For example, assume handling September 21, 2022, at 12:00 PM in KST without specifying the time zone.

```plaintext
"2022-09-21T12:00:00"
```

- If a server in Korea responds with "2022-09-21T12:00:00" to a user living in the United States, the date must be converted to U.S. time. However, since the date does not explicitly specifies that it is in KST, it cannot be correctly converted to U.S. time.

- Conversely, if a user in Korea sends a request with "2022-09-21T12:00:00" to a server in the United States for date comparison, unifying the time zones is necessary for proper comparison. However, since the user-sent date lacks time zone specification, correct comparison is not possible.

- If a server in Korea needs to store "2022-09-21T12:00:00" in a database located in the United States, the date must be converted to U.S. time. But it is not possible and may result in significant time discrepancies.

In conclusion, when communicating with external things, it is necessary to tell them where I am.

For example, there might be an opinion like, "Since my server is always located in the United States, can't you assume and use it in U.S. time even if I don't specify the time zone?"

However, countries including the United States follow daylight saving time, advancing the standard time during certain periods each year. Instead of writing logic to calculate the time difference considering daylight saving time, specifying the time zone is a better approach.

The same applies even to countries without daylight saving time. Rather than managing "Which time zone is this server located in?", specifying the time zone is better.

I believe there are valid reasons for the international standards being developed after decades of effort, and I recommend following them.

If there is not awareness of time zone specification in your organization, why don't you suggest to do it?

## References

- [Coordinated Universal Time](https://en.wikipedia.org/wiki/Coordinated_Universal_Time)
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)
- [Daylight Saving Time](https://en.wikipedia.org/wiki/Daylight_saving_time)
