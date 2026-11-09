"""Brewline: when a raw order file lands in S3, write a small summary next to the curated data.

Runs as an S3-triggered Lambda function. Two details matter in production:
  1. S3 sends the object key URL-encoded in the event, so "dt=2026-03-14" arrives as "dt%3D2026-03-14".
  2. S3 can deliver the same event more than once, so the write must be safe to repeat.
"""
import json
import os
import urllib.parse

import boto3
from botocore.exceptions import ClientError

s3 = boto3.client("s3")
SUMMARY_PREFIX = os.environ.get("SUMMARY_PREFIX", "curated/order_summaries/")


def summarize(lines):
    orders = [json.loads(line) for line in lines if line.strip()]
    kept = [o for o in orders if o["status"] != "CANCELLED"]
    return {"orders": len(orders), "revenue_usd": round(sum(o["total_usd"] for o in kept), 2)}


def lambda_handler(event, context):
    results = []
    for record in event["Records"]:
        bucket = record["s3"]["bucket"]["name"]
        key = record["s3"]["object"]["key"]
        body = s3.get_object(Bucket=bucket, Key=key)["Body"].read().decode()
        summary = summarize(body.splitlines())
        out_key = SUMMARY_PREFIX + key.replace("/", "_") + ".json"
        try:
            s3.put_object(Bucket=bucket, Key=out_key, Body=json.dumps(summary).encode(), IfNoneMatch="*")
            status = "written"
        except ClientError as err:
            if err.response["Error"]["Code"] != "PreconditionFailed":
                raise
            status = "already done"
        results.append({"key": key, "status": status, **summary})
    return {"results": results}
