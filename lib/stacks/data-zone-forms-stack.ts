// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as cdk from 'aws-cdk-lib';
import { CustomResource } from 'aws-cdk-lib';
import * as datazone from 'aws-cdk-lib/aws-datazone';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import projectFormConfigs = require('../config/project_form_config.json');

export interface DataZoneFormsStackProps extends cdk.StackProps {
  readonly domainId: string;
  readonly formCustomResource: Provider;
  readonly projectMap: Map<string, datazone.CfnProject>;
}

export class DataZoneFormsStack extends cdk.Stack {

  constructor(scope: Construct, id: string, props: DataZoneFormsStackProps) {
    super(scope, id, props);

    for (const projectFormConfiguration of projectFormConfigs) {
      const projectName = projectFormConfiguration.projectName;
      const project = props.projectMap.get(projectName);
      if (project == undefined) {
        throw new Error('Configuration not present for project ' + projectName);
      }
      const projectId = project?.attrId;

      const projectForms = projectFormConfiguration.forms;

      for (const form of projectForms) {
        const formName = form.formName;
        const formDescription = form.formDescription ?? '';
        const smithyContent = form.formSmithyModel;

        const formCR = new CustomResource(this, formName + 'Form', {
          serviceToken: props.formCustomResource.serviceToken,
          properties: {
            DomainIdentifier: props.domainId,
            ProjectIdentifier: projectId,
            FormName: formName,
            FormDescription: formDescription,
            FormModelSmithy: smithyContent,
          },
        });

        const formNameFromResource = formCR.getAttString('Name');
        const formRevision = formCR.getAttString('Revision');
      }
    }

  }
}
