CircleCI build status: [![Circle CI](https://circleci.com/gh/gaia-adm/webhook-service.svg?style=svg)](https://circleci.com/gh/gaia-adm/webhook-service)

Service for generating webhook tokens and accepting webhooks data (and possibly in the future - setting periodical data collection in cloud-based agent)

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
        "createdAt": 1450357761505,
        "token": "edf32766432ac20423cdd45e72f101dc6940f738",
        "hookUrl": "https://<server>:<port>/wh/edf32766432ac20423cdd45e72f101dc6940f738",
        "tenantId": 1048568626
    }
```

### Pushing data
Add the hookUrl (see above) to webhooks configuration

### Flow
When webhook data received, the webhook token is validated.
If WH token is valid (e.g., existing in the system):
  - tenantId is added to HTTP headers of the request
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
