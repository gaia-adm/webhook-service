CircleCI build status: [![Circle CI](https://circleci.com/gh/gaia-adm/webhook-service.svg?style=svg)](https://circleci.com/gh/gaia-adm/webhook-service)

Service for generating webhook tokens and accepting webhooks data

### Dependencies:
 - etcd - for saving generated webhook tokens
 - sts - for validating tenant during webhook generation
 - rabbitmq - for publishing data coming as webhooks

### Generating webhook:
**Request**
```
POST: <server>:<port>/wh/config
    Content-Type, Accept: application/json
    Authorization: Bearer <accesstoken>
    { "datasource":"github",
      "event": "push"}
```
**Response**:
```
    {
        "datasource": "github",
        "eventType": "push",
        "createdAt": 1450778008713,
        "apiToken": "f0cf847f-0bf4-4777-9a28-59b7a4b48309",
        "tenantId": 5618780000,
        "token": "7a8b7747fb02189cee0a3e62d0e717460923d945",
        "hookUrl": "https://localhost:3000/wh/f0cf847f-0bf4-4777-9a28-59b7a4b48309/7a8b7747fb02189cee0a3e62d0e717460923d945"
    }
```

### Pushing data
Add the hookUrl (see above) to webhooks configuration

### Flow
When webhook data received, the API token and Webhook token are validated.
If both are valid (e.g., existing in the system):
  - tenantId header is added to HTTP headers of the request
  - gaiaReceived header is added to HTTP headers of the request (ISO 8601 date/time, where the data is received)
  - ES _bulk API metadata is created (index - gaia_tenantId, type - eventType.datasource) and added before the webhook data; metadata is followed by a new line delimiter, as _bulk API requires
  - message is published to ES EventsIndexer queue while updated request headers are set as the message header

### Supported webhooks
Since the entire flow - from sending data to storing it into ES - is very generic and data is fluid, we can accept webhook for any event type from any source sending JSON data.
However it can bring some benefits, if we declare a list of event/datasources that we support, while the names of the events can be different in different datasources. Something like:
  - eventType: **push** supported for datasources:
    - [Github] (https://developer.github.com/webhooks/)
    - [Bitbucket] (https://confluence.atlassian.com/bitbucket/manage-webhooks-735643732.html)
  - eventType: **issue_change** supported for datasources:
    - [Github] (https://developer.github.com/webhooks/)
    - [JIRA] (https://developer.atlassian.com/jiradev/jira-apis/webhooks)
  - eventType: **build**  supported for datasources:
    - [Jenkins] (https://wiki.jenkins-ci.org/display/JENKINS/Notification+Plugin)
    - [CircleCI] (https://circleci.com/docs/configuration#notify)
    - [TravisCI] (https://docs.travis-ci.com/user/notifications/#Webhook-notification)

**NOTE**: In addition, we can be ready to accept any other event/datasource combination but with no validations or predefined widgets.