---
title: "How to represent and exchange dates?"
date: 2023-03-24T00:00:00+09:00
description: "Makes sure that everyone see correct dates"
thumbnail: ./thumbnail.png
locale: en
tags:
  - Front-end
  - Back-end
---

There are many cases to handle dates in front-end development.

- Remaining time to the end of verification
- Remaining time to the end of event
- etc.

And there are many cases to exchange them between client and server, then what is the correct format of them in those cases?

Let's learn about `ISO 8601`, the standard to represent and exchange them, and `UTC`, the time standard.

## ISO 8601 and UTC

`UTC` is the worldwide time standard which was implemented in 1972. Dates will be calculated from UTC.

And ISO 8601 is the worldwide standard how to represent them as string:

```
"2022-09-21"
"2022-09-21T12:00:00"
```

## How to represent time difference?

The time difference means the difference between the current time and UTC, and it is called `UTC offset`.

It will be represented in `ISO 8601`:

```
"2022-09-21T12:00:00±[hh]:[mm]"
```

For example, the standard time of South Korea is 9 hours slower than UTC. So September 21, 2022 at 12:00 PM will be represented:

```
"2022-09-21T12:00:00+09:00"
```

`+09:00` means that this is the time which is 9 hours added to UTC.

And `UTC offset`s of each nations and regions is called time zone. You can always see the correct time because of it.

To directly represent UTC, you should add `Z` or `+00:00` to the end of ISO 8601 string.

```
"2022-09-21T12:00:00Z"
"2022-09-21T12:00:00+00:00"
```

## If there's no specified time zone

I think now you may know dates should be represented following ISO 8601, and time zone must be specified when you exchange them, like:

```
1. ISO 8601 string with UTC offset
"2022-09-21T12:00:00+09:00"

2. ISO 8601 string in UTC
"2022-09-21T03:00:00Z"

3. Unix Timestamp (UTC)
1663729200000
```

If not, it will make too many confusions. If a server responds `"2022-09-21T12:00:00"` to a client, the client cannot correctly represent the date because it doesn't know about how much difference from the date to UTC.

However, someone may have a question: "My server is always located in USA, so I think the client should consider the server dates as the USA standard time, shouldn't it?".

But many other nations including USA have implemented daylight saving time(DST), the rule to advance their standard time in specific period. Therefore it is better that the server specify time zone, than the client consider DST and calculate current time.

I think there must have been an apparent reason why the worldwide standard have been created after discussions of decades, so I recommend you to follow.

## References

- [Coordinated Universal Time](https://en.wikipedia.org/wiki/Coordinated_Universal_Time)
- [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)
- [Daylight Saving Time](https://en.wikipedia.org/wiki/Daylight_saving_time)
