#!/bin/bash

#Set the endpoint to test
#ENDPOINT="http://FisDe-LB8A1-NXC4TPNXAQ6G-264532554.us-east-1.elb.amazonaws.com"

if [ -z "$1" ]; then
  echo "Usage: $0 <endpoint>"
  exit 1
fi

ENDPOINT=$1
success=0
fail=0
total_requests=50
echo "Testing endpoint: $ENDPOINT"

print_counts() {
  total=$((success+fail))
  echo "Total requests: $total"
  echo "Success rate: $(($success*100/$total))%"
  echo "Fail rate: $(($fail*100/$total))%"
  exit 0
}

trap print_counts INT

for i in $(seq 1 $total_requests); do
  request=$(curl --connect-timeout 5 -s -o /dev/null -w "%{http_code}\n" $ENDPOINT)
  if [ $request -eq "200" ]; then
    echo "Success - $request"
    success=$((success+1))
  else
    echo "Fail - $request"
    fail=$((fail+1))
  fi
  sleep 1
done

print_counts

