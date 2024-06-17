// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import * as datazone from 'aws-cdk-lib/aws-datazone';
import { Construct } from 'constructs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import projectConfigs = require('../config/project_config.json');

export interface DataZoneProjectStackProps extends cdk.StackProps {
  readonly domainId: string;
}

export class DataZoneProjectStack extends cdk.Stack {
  public projectMap: Map<string, datazone.CfnProject>;

  constructor(scope: Construct, id: string, props: DataZoneProjectStackProps) {
    super(scope, id, props);
    this.projectMap = new Map<string, datazone.CfnProject>();

    let previousProject = null;
    for (const projectConfiguration of projectConfigs) {
      const projectName = projectConfiguration?.projectName;
      const projectDescription= projectConfiguration?.projectDescription;

      const project= new datazone.CfnProject(this, projectName!, {
        description: projectDescription,
        domainIdentifier: props.domainId,
        glossaryTerms: undefined,
        name: projectName!,
      });

      if (previousProject != null) {
        project.node.addDependency(previousProject);
      }

      previousProject = project;

      if (this.projectMap.get(projectName) != undefined) {
        throw new Error('Duplicate configurations present for project ' + projectName);
      } else {
        this.projectMap.set(projectName, project);
      }
    }

  }

}
