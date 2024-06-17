"""
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
"""

import sys
import boto3

def handler(event, context):
    """
    The handler function is the entry point for the AWS Lambda function. It receives an event and context object.

    Args:
        event (dict): A dictionary containing the event data.
        context (object): An object containing information about the invocation, function, and execution environment.

    Returns:
        dict: A dictionary containing the status and optionally, the PhysicalResourceId and Data.

    This function is designed to handle three types of requests: Create, Update, and Delete. It performs the following
    tasks:

    1. Retrieves the required parameters from the event object.
    2. Validates the required parameters.
    3. Initializes the AWS DataZone client.
    4. Based on the request type, it calls the appropriate helper functions to create, update, or delete a form.
    5. Returns the appropriate response.
    """
    print('Received event:', event)

    domain_identifier = event['ResourceProperties'].get('DomainIdentifier', None)
    project_identifier = event['ResourceProperties'].get('ProjectIdentifier', None)
    name = event['ResourceProperties'].get('FormName', None)
    description = event['ResourceProperties'].get('FormDescription', None)
    status = event['ResourceProperties'].get('FormStatus', None)
    model_smithy = event.get("ResourceProperties", {}).get("FormModelSmithy")

    if not domain_identifier or not project_identifier or not name or not model_smithy:
        raise Exception(
            "Invalid event. "
            "Missing DomainIdentifier or ProjectIdentifier or FormName or FormModelSmithy."
        )

    if not status:
        print(f"Status not specified for Form {name} in domain {domain_identifier}, project "
              f"{project_identifier}, defaulting to enabled")
        status = "ENABLED"

    if not description:
        print(f"Description not specified for Form with {name} in domain {domain_identifier}, project "
              f"{project_identifier}, defaulting to null")
        description = ""

    client = boto3.client('datazone')

    if event['RequestType'] == 'Create':
        response = create_form(client, domain_identifier, project_identifier, status, name, description, model_smithy)
        response_data = {"Name": response["name"], "Revision": response["revision"]}
        return {'status': 'SUCCESS', 'PhysicalResourceId': name, 'Data': response_data}

    elif event['RequestType'] == 'Update':
        response = create_form(client, domain_identifier, project_identifier, status, name, description, model_smithy)
        response_data = {"Name": response["name"], "Revision": response["revision"]}
        return {'status': 'SUCCESS', 'PhysicalResourceId': name, 'Data': response_data}

    elif event['RequestType'] == 'Delete':
        response = create_form(client, domain_identifier, project_identifier, "DISABLED", name, description, model_smithy)
        delete_form(client, domain_identifier, name)

    return {'status': 'SUCCESS'}


def create_form(client, domain_identifier, project_identifier, status, name, description, model_smithy):
    """
    Creates a new form in the specified domain and project.

    Args:
        client (boto3.client): The AWS DataZone client.
        domain_identifier (str): The identifier of the domain.
        project_identifier (str): The identifier of the project.
        status (str): The status of the form (ENABLED or DISABLED).
        name (str): The name of the form.
        description (str): The description of the form.
        model_smithy (str): The Smithy model for the form.

    Returns:
        dict: The response from the AWS Data Zone client after creating the form.

    This function takes the required parameters and calls the create_form_type method of the AWS Data Zone client.
    It prints a message indicating that the form is being created and returns the response from the client.
    If an exception occurs during the creation process, it prints an error message and raises the exception.
    """
    try:
        print(f"Creating Form {name} for domain {domain_identifier} and project {project_identifier}, status {status}")
        return client.create_form_type(
            description=description,
            domainIdentifier=domain_identifier,
            model={"smithy": model_smithy},
            name=name,
            owningProjectIdentifier=project_identifier,
            status=status,
        )

    except Exception as e:
        print(
            f"Error creating Form with name {name} {e} for domain {domain_identifier} and project {project_identifier}"
            f", error: {e}")
        raise


def delete_form(client, domain_identifier, name):
    """
    Deletes an existing form in the specified domain.

    Args:
        client (boto3.client): The AWS DataZone client.
        domain_identifier (str): The identifier of the domain.
        name (str): The name of the form to delete.

    This function takes the required parameters and calls the delete_form_type method of the AWS Data Zone client.
    It prints a message indicating that the form is being deleted.
    If an exception occurs during the deletion process, it prints an error message and raises the exception.
    """
    try:
        print(f"Deleting Form for domain {domain_identifier} and identifier {name}")
        return client.delete_form_type(
            domainIdentifier=domain_identifier, formTypeIdentifier=name
        )

    except Exception as e:
        print(f"Error deleting Form with name {name} {e} for domain {domain_identifier}, error: {e}")
        raise
