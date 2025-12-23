#!/bin/sh

# env.sh

cat <<EOF
{
  "aws_access_key": "$AWS_ACCESS_KEY",
  "aws_secret_key": "$AWS_SECRET_KEY",
  "aws_session_token": "$AWS_SESSION_TOKEN"
}
EOF