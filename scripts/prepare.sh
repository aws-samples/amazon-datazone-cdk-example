#!/bin/bash
## Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
## SPDX-License-Identifier: MIT-0

# Check if the correct number of arguments are provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <aws_account_id> <aws_region>"
    exit 1
fi

# Assigning command line arguments to variables
aws_account_id="$1"
aws_region="$2"

# Array of files to perform replacements in
files=(
    "lib/config/project_config.json"
    "lib/config/project_environment_config.json"
    "lib/constants.ts"
    # Add more files here if needed
)

# Loop through the array of files and perform replacements
for file in "${files[@]}"; do
    # Check if the file exists
    if [ ! -f "$file" ]; then
        echo "Error: File '$file' not found."
        continue
    fi
    
    # Perform the string replacements using sed
    sed -i "" "s/AWS_ACCOUNT_ID_PLACEHOLDER/$aws_account_id/g; s/AWS_REGION_PLACEHOLDER/$aws_region/g" "$file"

    echo "Replacements performed in '$file'."
done
