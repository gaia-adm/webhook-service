[![Circle CI](https://circleci.com/gh/gaia-adm/webhook-service.svg?style=svg)](https://circleci.com/gh/gaia-adm/webhook-service) [![Codacy Badge](https://api.codacy.com/project/badge/grade/2e1a8ea1940c465887a4cff3ddf916f6)](https://www.codacy.com/app/alexei-led/webhook-service) [![](https://badge.imagelayers.io/gaiaadm/whs:latest.svg)](https://imagelayers.io/?images=gaiaadm/whs:latest 'Get your own badge on imagelayers.io')

Service for generating webhook tokens and accepting webhooks data

### Dependencies:
 - etcd - for saving generated webhook tokens
 - sts - for validating tenant during webhook generation
 - rabbitmq - for publishing data coming as webhooks

### Generating webhook:
**Request**
```
POST: https://webhook.mydomain.gaiahub.io/wh/config
    Content-Type: application/json
    Accept: application/json
    Authorization: Bearer <accesstoken>
    { "datasource":"github",
      "event": "push",
      "tsField": "commits[0].timestamp"}
```
NOTES:
  - The same API creates the new webhook configuration or updates the existing one, if webhook already exists in the tenant for datasource and event provided
  - tsField is optional and defines the field of the webhook that contains the timestamp we want use. If tsField is not provided when updating the existing webhook, no update on this field. Sending explicitly the empty string as tsField, nullify this field

**Response**: HTTP-200
```
    {
        "datasource": "github",
        "event": "push",
        "createdAt": 1450778008713,
        "apiToken": "f0cf847f-0bf4-4777-9a28-59b7a4b48309",
        "tenantId": 5618780000,
        "token": "7a8b7747fb02189cee0a3e62d0e717460923d945",
        "tsField": "commits[0].timestamp",
        "hookUrl": "https://webhook.mydomain.gaiahub.io/wh/f0cf847f-0bf4-4777-9a28-59b7a4b48309/7a8b7747fb02189cee0a3e62d0e717460923d945"
    }
```

### Pushing data
Add the hookUrl (see above) to webhooks configuration
NOTE: Meanwhile there is no restriction of using webhook generated for certain event/datasource with different event/datasource so use carefully.

### Other APIs:
**Get webhook details**:
```
GET: https://webhook.mydomain.gaiahub.io/wh/config/<webhook-token>
    Content-Type: application/json
    Accept: application/json
    Authorization: Bearer <accesstoken>
```
**Response**:
HTTP-200 (webhooks details - the same as for webhook creation)

**Get details for all webhooks defined for the tenant**:
```
GET: https://webhook.mydomain.gaiahub.io/wh/config
    Content-Type: application/json
    Accept: application/json
    Authorization: Bearer <accesstoken>
```
**Response**:
HTTP-200 (list of webhooks details - the same as for webhook creation)

**Delete webhook configuration**:
```
DELETE: https://webhook.mydomain.gaiahub.io/wh/config/<webhook-token>
    Content-Type: application/json
    Accept: application/json
    Authorization: Bearer <accesstoken>
```
**Response**:
HTTP-204

**Webhook validation**:
```
HEAD: https://webhook.mydomain.gaiahub.io/wh/config/<webhook-token>
    Content-Type: application/json
    Accept: application/json
    Authorization: Bearer <accesstoken>
```
**Response**:
HTTP-200 (empty)

### Flow
When webhook data received, the API token and Webhook token are validated.
If both are valid (e.g., existing in the system):
  - routingkey in the format of event.TENANT_ID.DATA_SOURCE.DATA_TYPE is created
  - message is published to events-to-enrich exchange

### Supported webhooks
Since the entire flow - from sending data to storing it into ES - is very generic and data is fluid, we can accept webhook for any event type from any source sending JSON data.
However it can bring some benefits, if we declare a list of event/datasources that we support, while the names of the events can be different in different datasources. Something like:
  - event: **push** supported for datasources:
    - [Github] (https://developer.github.com/webhooks/)
    - [Bitbucket] (https://confluence.atlassian.com/bitbucket/manage-webhooks-735643732.html)
  - event: **issue_change** supported for datasources:
    - [Github] (https://developer.github.com/webhooks/)
    - [JIRA] (https://developer.atlassian.com/jiradev/jira-apis/webhooks)
  - event: **build**  supported for datasources:
    - [Jenkins] (https://wiki.jenkins-ci.org/display/JENKINS/Notification+Plugin)
    - [CircleCI] (https://circleci.com/docs/configuration#notify)
    - [TravisCI] (https://docs.travis-ci.com/user/notifications/#Webhook-notification)

**NOTE**: In addition, we can be ready to accept any other event/datasource combination but with no validations or predefined widgets.

Known issues with webhooks:
- CircleCI and DockerHub webhooks do not support per organization/user settings, webhook must be set individually for each project
- DockerHub webhook stays in "pending" status forever in case of successful sending (https://github.com/docker/hub-feedback/issues/423)
- Self-signed certificate for https Webhook URL is supported by GitHub, not supported by DockerHub, Trello
