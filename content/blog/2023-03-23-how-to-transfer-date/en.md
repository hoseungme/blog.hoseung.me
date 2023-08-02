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

There are many cases to handle date in front-end development.

- Remaining time until the end of verification
- Remaining time until the end of event
- etc.

And there are many cases to exchange date between client and server. So, what is the correct format for them in those cases?

Let's learn about `ISO 8601`, the standard for representing and exchanging date, and `UTC`, the time standard.

## ISO 8601 and UTC

`UTC` is the worldwide time standard that was implemented in 1972. Date will be calculated from UTC.

ISO 8601 is the worldwide standard for representing and exchanging date as string:

```
"2022-09-21"
"2022-09-21T12:00:00"
```

## How to represent time difference?

The time difference refers to the difference between the current time and UTC, and it is called `UTC offset`.

It will be represented in `ISO 8601` format:

```
"2022-09-21T12:00:00±[hh]:[mm]"
```

For example, the standard time of South Korea is 9 hours later than UTC. So, September 21, 2022 at 12:00 PM will be represented:

```
"2022-09-21T12:00:00+09:00"
```

`+09:00` means that this time is 9 hours later than UTC.

And `UTC offset` of a nation or a region is called time zone. You can always see the correct time because of it.

To directly represent UTC, you should add `Z` or `+00:00` at the end of the ISO 8601 string:

```
"2022-09-21T12:00:00Z"
"2022-09-21T12:00:00+00:00"
```

## If there's no specified time zone

I think now you may know date should be represented following ISO 8601, and time zone must be specified when you exchange them, like:

```
1. ISO 8601 string with UTC offset
"2022-09-21T12:00:00+09:00"

2. ISO 8601 string in UTC
"2022-09-21T03:00:00Z"

3. Unix Timestamp (UTC)
1663729200000
```

If not, it will make too many confusion. If a server responds with `"2022-09-21T12:00:00"` to a client, the client cannot correctly represent the date because it doesn't know the time difference from the date to UTC.

However, someone may have a question: "My server is always located in the USA, so I think the client should consider the server date as the the USA standard time, shouldn't it?".

But many other nations including the USA have implemented daylight saving time(DST), the rule to advance their standard time in specific period. Therefore it is better that the server specify time zone, than the client consider DST and calculate current time.

I think there must have been an apparent reason why the worldwide standard was created after decades of discussions, so I recommend you to follow.

## References

- [Coordinated Universal Time](https://en.wikipedia.org/wiki/Coordinated_Universal_Time)
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)
- [Daylight Saving Time](https://en.wikipedia.org/wiki/Daylight_saving_time)
