---
title: "How to synchronize changed data in DynamoDB with other services: DynamoDB Streams"
date: 2022-02-19T00:00:00+09:00
description: How can do this without any failure or overload in your server?
thumbnail: ./thumbnail.png
locale: en
tags:
  - Back-end
  - AWS
---

Recently, I made the target system at my team, to expose posts across the site. In other words, I made them searchable using the target.

In this post, I will briefly summarize my thoughts, the development process, and what I learned during this task.

## How to make posts searchable?

Posts are being stored in DynamoDB, a fully-managed NoSQL database provided by AWS. However, directly applying search in the existing infrastructure was not feasible. This was due to the characteristics of NoSQL and DynamoDB, where applying complex conditions while querying data is challenging.

While conditions can be applied during the scan operation of DynamoDB, it doesn't mean scanning only the data that meet the conditions. The scan operation works by scanning all data first as much as requested by client without any conditions, and then [filter the results with the conditions](https://docs.aws.amazon.com/en_us/amazondynamodb/latest/developerguide/Scan.html#Scan.FilterExpression). As a result, the number of response data could differ from the count requested by the client.

This means that proper pagination is impossible, leading to significant losses in terms of user experience and communication costs between client and server.

Therefore, I had to either migrate posts to an RDB like MySQL or index them in a search engine like Elasticsearch.

### RDB vs Search Engine - Which one to choose?

In this situation, which is the correct choice between RDB and a search engine?

Posts consist of various blocks like:

![](./images/posts/2022-02-19-dynamodb-stream-elasticsearch/post-blocks.png)

```typescript
type BlockSchema = |
  {
    type: "paragraph",
    text: string;
  } |
  {
    type: "image",
    image: {
      src: string;
      alt: string;
      width: number;
      height: number;
    }
  } |
  /* ... */

interface Post {
  /* ... */
  blocks: BlockSchema[];
}
```

To move this data to an RDB, it looks good to create tables for each block and establish a 1:n relationship. However, due to the frequent changes in the `BlockSchema` schema, I thought the cost of adding/modifying/deleting tables each time is much higher compared to using NoSQL.

Moreover, even considering changes in the `Post` schema, RDB seemed unsuitable. Therefore, I decided to keep using DynamoDB and index posts in Elasticsearch, a search engine currently used by my team.

## How to index?

When changes occur in the Post DB, these changes need to be reflected in the Elasticsearch index.

There are two main ways to access a separate service like Elasticsearch from the backend:

1. Direct access from the router
2. Access based on event and queues

### 1. Direct access from the router

```typescript
// Example
const post = Post.get(postId);
post.content = newContent;
await post.save();

elasticsearch.index(post);

res.status(200).json({ post });
```

The advantages of this approach are simple implementation and lower costs, but it has several significant drawbacks.

First, directly indexing in Elasticsearch from the router increases response time.

And it is also challenging to prevent the propagation of failures. If an error occurs in Elasticsearch, it would be directly propagated to the router.

Even if errors are not thrown to user, all changes during the time of Elasticsearch issues will be lost.

And definitely, indexing is not related to request of users. They just want to edit a post.

### 2. Access based on event and queues

This approach looks better than the former because users don't have to wait for Elasticsearch indexing and are not affected by Elasticsearch downtime.

And AWS messaging queue services support continuous retries for failure. This reduces the likelihood of data loss. And they helps to distribute traffic by adjusting maximum concurrency.

So even if there is sudden surge in traffic, Elasticsearch instance will always get the same amount of traffic.

Therefore, I concluded that the second approach is more suitable.

## Detecting changes in DynamoDB

There is a concept called Change Data Capture (CDC), which tracks and records changes in database so that you can do subsequent actions such as indexing in Elasticsearch or syncing with a Read Replica, etc.

For example, in RDS, you can use AWS Database Migration Service + Kinesis Stream, and in DynamoDb, you can use DynamoDB Streams, to use CDC.

It is pretty simple to use. You just write Lambda function and register it as a trigger for DynamoDB Streams. And then an event will be sent to the function when changes occur in DynamoDB.

In summary, the flow can be represented as follows:

![](./images/posts/2022-02-19-dynamodb-stream-elasticsearch/dynamodb-stream-diagram-en.jpg)

## Creating a DynamoDB Stream Trigger

According to ["Step 4: Create and test a Lambda function"](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.Tutorial.html#Streams.Lambda.Tutorial.LambdaFunction) in the official guide, DynamoDB Streams pass an event object to Lambda function, in the following format:

```json
{
  "Records": [
    {
      "eventID": "7de3041dd709b024af6f29e4fa13d34c",
      "eventName": "INSERT",
      "eventVersion": "1.1",
      "eventSource": "aws:dynamodb",
      "awsRegion": "region",
      "dynamodb": {
        "ApproximateCreationDateTime": 1479499740,
        "Keys": {
          "Timestamp": {
            "S": "2016-11-18:12:09:36"
          },
          "Username": {
            "S": "John Doe"
          }
        },
        "NewImage": {
          "Timestamp": {
            "S": "2016-11-18:12:09:36"
          },
          "Message": {
            "S": "This is a bark from the Woofer social network"
          },
          "Username": {
            "S": "John Doe"
          }
        },
        "SequenceNumber": "13021600000000001596893679",
        "SizeBytes": 112,
        "StreamViewType": "NEW_IMAGE"
      },
      "eventSourceARN": "arn:aws:dynamodb:region:account ID:table/BarkTable/stream/2016-11-16T20:42:48.104"
    }
  ]
}
```

It's quite cumbersome to directly use an event object above because it's mapped to the data types (N, S) of DynamoDB.

Although the [unmarshal function provided by AWS SDK V3's util-dynamodb](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-util-dynamodb/Variable/unmarshall/), I have used [dynamorm-stream](https://github.com/serverless-seoul/dynamorm-stream), an open-source developed by my team.

> To use `dynamorm-stream`, you need to define the DynamoDB table using another open-source from my team, [dynamorm](https://github.com/serverless-seoul/dynamorm).

`dynamorm-stream` processes the complex event object from DynamoDB into an easy-to-use format and also supports error handling.

```typescript
import { TableHandler } from "@serverless-seoul/dynamorm-stream";
import type { InsertStreamEvent, ModifyStreamEvent, RemoveStreamEvent } from "@serverless-seoul/dynamorm-stream";

import { Post } from "../../models/dynamodb";

import { catchError } from "../helpers/catch_error";

import { clients } from "../clients";

export async function handler(
  events: Array<InsertStreamEvent<Post> | ModifyStreamEvent<Post> | RemoveStreamEvent<Post>>
) {
  await Promise.all(
    _.chain(events)
      .map((event) => {
        switch (event.type) {
          case "INSERT": /* ... */
          case "MODIFY": /* ... */
          case "REMOVE": /* ... */
        }
      })
      .map((data) => clients.search.indexPosts.dispatch({ data }))
      .value()
  );
}

export const postHandler = new TableHandler(
  Post,
  "Series",
  [
    {
      eventType: "ALL",
      name: handler.name,
      handler,
    },
  ],
  catchError
);
```

My team is building a backend system based on serverless + microservices architecture using Lambda, so `clients.search.indexPosts.dispatch({ data })` is Lambda function invocation.

But unfortunately, there were errors during testing on the development environment and it is related to [asynchronous invocation payload limits](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html#function-configuration-deployment-and-execution) for Lambda function. The limit is 256KB, but the `handler` function didn't consider it.

So I made a simple function named `chunkByByteLength` to adjust the payload size.

```typescript
export function chunkByByteLength<T>(array: T[], threshold: number) {
  const chunks: T[][] = [];
  let buffer: T[] = [];

  for (const chunk of array) {
    buffer.push(chunk);
    const size = Buffer.byteLength(JSON.stringify(buffer));

    if (size > threshold) {
      const last = buffer.pop()!;
      chunks.push(buffer);
      buffer = [last];
    }
  }
  if (buffer.length) {
    chunks.push(buffer);
  }

  return chunks;
}
```

```typescript
await Promise.all(
  _.chain(events)
    .map((event) => {
      switch (event.type) {
        case "INSERT": /* ... */
        case "MODIFY": /* ... */
        case "REMOVE": /* ... */
      }
    })
    // chunk by 200KB
    .thru((payload) => chunkByByteLength(payload, 200 * 1024))
    .map((data) => clients.search.indexPosts.dispatch({ data }))
    .value()
);
```

## Indexing existing post data in Elasticsearch

All works above were just for new changes in Post table, so it was needed to index all exisiting posts in Elasticsearch.

Since the number of posts was small (around 650), I just wrote a simple script to index them.

```typescript
import { Post } from "../src/models/dynamodb/post";

export async function scanAllPosts(): Promise<Post[]> {
  let posts: Post[] = [];
  try {
    let exclusiveStartKey = undefined;

    do {
      const result = await Post.primaryKey.scan({ exclusiveStartKey });
      posts = [...posts, ...result.records];
      exclusiveStartKey = result.lastEvaluatedKey as any;
    } while (exclusiveStartKey);

    return posts;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function indexAllPosts() {
  const posts = await scanAllPosts();
  try {
    await Promise.all(
      _.chain(posts)
        .map((post) => /* ... */)
        // chunk by 200KB
        .thru((payload) => chunkByByteLength(payload, 200 * 1024))
        .map((data) => clients.search.indexPosts.dispatch({ data }))
        .value(),
    );
  } catch (e) {
    console.log(e);
  }
}

indexAllPosts();
```

## Enabling DynamoDB Streams

Enabling DynamoDB Streams was straightforward. I just did it with a few clicks, following the [official documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html#Streams.Enabling).

![](./images/posts/2022-02-19-dynamodb-stream-elasticsearch/dynamodb-stream-enable.png)

## Conclusion

I have learned many things from this task such as various use of Lambda, RDB vs NoSQL comparison, solutions of avoiding failures in distributed system, etc.

Thank you for reading, and I would appreciate any feedbacks if you have.
