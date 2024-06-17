// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

export function getEnvProfileMapKey(projectName: string, envProfileName: string) {
  return projectName + '#' + envProfileName;
}

export function getEnvironmentMapKey(projectName: string, envName: string) {
  return projectName + '#' + envName;
}