'use strict';

var request = require('request');
var chai = require('chai');
var expect = chai.expect;

var eventHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Expect': '',
    'User-Agent': 'GitHub-Hookshot/cd33156',
    'X-GitHub-Delivery': '32c68400-078e-11e6-97e2-99ef6a87688f',
    'X-GitHub-Event': 'push'
}

var eventContent = {
    "ref": "refs/heads/master",
    "before": "bd5c21118340b74aa2531aeae8648f217562086d",
    "after": "206f23cc88bfb70e69159a50c1c66e454db323cf",
    "created": false,
    "deleted": false,
    "forced": false,
    "base_ref": null,
    "compare": "https://github.com/gaia-adm/webhook-service/compare/bd5c21118340...206f23cc88bf",
    "commits": [{
        "id": "206f23cc88bfb70e69159a50c1c66e454db323cf",
        "distinct": true,
        "message": "dependencies cleanup",
        "timestamp": "2015-12-10T13:37:48+02:00",
        "url": "https://github.com/gaia-adm/webhook-service/commit/206f23cc88bfb70e69159a50c1c66e454db323cf",
        "author": {"name": "boriska70@gmail.com", "email": "boriska70@gmail.com", "username": "boriska70"},
        "committer": {"name": "boriska70@gmail.com", "email": "boriska70@gmail.com", "username": "boriska70"},
        "added": [],
        "removed": [],
        "modified": ["circle.yml", "test/integration/persistence-controller-test.js"]
    }],
    "head_commit": {
        "id": "206f23cc88bfb70e69159a50c1c66e454db323cf",
        "distinct": true,
        "message": "dependencies cleanup",
        "timestamp": "2015-12-10T13:37:48+02:00",
        "url": "https://github.com/gaia-adm/webhook-service/commit/206f23cc88bfb70e69159a50c1c66e454db323cf",
        "author": {"name": "boriska70@gmail.com", "email": "boriska70@gmail.com", "username": "boriska70"},
        "committer": {"name": "boriska70@gmail.com", "email": "boriska70@gmail.com", "username": "boriska70"},
        "added": [],
        "removed": [],
        "modified": ["circle.yml", "test/integration/persistence-controller-test.js"]
    },
    "repository": {
        "id": 47271508,
        "name": "webhook-service",
        "full_name": "gaia-adm/webhook-service",
        "owner": {"name": "gaia-adm", "email": ""},
        "private": false,
        "html_url": "https://github.com/gaia-adm/webhook-service",
        "description": "",
        "fork": false,
        "url": "https://github.com/gaia-adm/webhook-service",
        "forks_url": "https://api.github.com/repos/gaia-adm/webhook-service/forks",
        "keys_url": "https://api.github.com/repos/gaia-adm/webhook-service/keys{/key_id}",
        "collaborators_url": "https://api.github.com/repos/gaia-adm/webhook-service/collaborators{/collaborator}",
        "teams_url": "https://api.github.com/repos/gaia-adm/webhook-service/teams",
        "hooks_url": "https://api.github.com/repos/gaia-adm/webhook-service/hooks",
        "issue_events_url": "https://api.github.com/repos/gaia-adm/webhook-service/issues/events{/number}",
        "events_url": "https://api.github.com/repos/gaia-adm/webhook-service/events",
        "assignees_url": "https://api.github.com/repos/gaia-adm/webhook-service/assignees{/user}",
        "branches_url": "https://api.github.com/repos/gaia-adm/webhook-service/branches{/branch}",
        "tags_url": "https://api.github.com/repos/gaia-adm/webhook-service/tags",
        "blobs_url": "https://api.github.com/repos/gaia-adm/webhook-service/git/blobs{/sha}",
        "git_tags_url": "https://api.github.com/repos/gaia-adm/webhook-service/git/tags{/sha}",
        "git_refs_url": "https://api.github.com/repos/gaia-adm/webhook-service/git/refs{/sha}",
        "trees_url": "https://api.github.com/repos/gaia-adm/webhook-service/git/trees{/sha}",
        "statuses_url": "https://api.github.com/repos/gaia-adm/webhook-service/statuses/{sha}",
        "languages_url": "https://api.github.com/repos/gaia-adm/webhook-service/languages",
        "stargazers_url": "https://api.github.com/repos/gaia-adm/webhook-service/stargazers",
        "contributors_url": "https://api.github.com/repos/gaia-adm/webhook-service/contributors",
        "subscribers_url": "https://api.github.com/repos/gaia-adm/webhook-service/subscribers",
        "subscription_url": "https://api.github.com/repos/gaia-adm/webhook-service/subscription",
        "commits_url": "https://api.github.com/repos/gaia-adm/webhook-service/commits{/sha}",
        "git_commits_url": "https://api.github.com/repos/gaia-adm/webhook-service/git/commits{/sha}",
        "comments_url": "https://api.github.com/repos/gaia-adm/webhook-service/comments{/number}",
        "issue_comment_url": "https://api.github.com/repos/gaia-adm/webhook-service/issues/comments{/number}",
        "contents_url": "https://api.github.com/repos/gaia-adm/webhook-service/contents/{+path}",
        "compare_url": "https://api.github.com/repos/gaia-adm/webhook-service/compare/{base}...{head}",
        "merges_url": "https://api.github.com/repos/gaia-adm/webhook-service/merges",
        "archive_url": "https://api.github.com/repos/gaia-adm/webhook-service/{archive_format}{/ref}",
        "downloads_url": "https://api.github.com/repos/gaia-adm/webhook-service/downloads",
        "issues_url": "https://api.github.com/repos/gaia-adm/webhook-service/issues{/number}",
        "pulls_url": "https://api.github.com/repos/gaia-adm/webhook-service/pulls{/number}",
        "milestones_url": "https://api.github.com/repos/gaia-adm/webhook-service/milestones{/number}",
        "notifications_url": "https://api.github.com/repos/gaia-adm/webhook-service/notifications{?since,all,participating}",
        "labels_url": "https://api.github.com/repos/gaia-adm/webhook-service/labels{/name}",
        "releases_url": "https://api.github.com/repos/gaia-adm/webhook-service/releases{/id}",
        "created_at": 1449071568,
        "updated_at": "2015-12-02T15:59:09Z",
        "pushed_at": 1449747475,
        "git_url": "git://github.com/gaia-adm/webhook-service.git",
        "ssh_url": "git@github.com:gaia-adm/webhook-service.git",
        "clone_url": "https://github.com/gaia-adm/webhook-service.git",
        "svn_url": "https://github.com/gaia-adm/webhook-service",
        "homepage": null,
        "size": 31,
        "stargazers_count": 0,
        "watchers_count": 0,
        "language": "JavaScript",
        "has_issues": true,
        "has_downloads": true,
        "has_wiki": true,
        "has_pages": false,
        "forks_count": 0,
        "mirror_url": null,
        "open_issues_count": 1,
        "forks": 0,
        "open_issues": 1,
        "watchers": 0,
        "default_branch": "master",
        "stargazers": 0,
        "master_branch": "master",
        "organization": "gaia-adm"
    },
    "pusher": {"name": "boriska70", "email": "boriska70@gmail.com"},
    "organization": {
        "login": "gaia-adm",
        "id": 12234526,
        "url": "https://api.github.com/orgs/gaia-adm",
        "repos_url": "https://api.github.com/orgs/gaia-adm/repos",
        "events_url": "https://api.github.com/orgs/gaia-adm/events",
        "members_url": "https://api.github.com/orgs/gaia-adm/members{/member}",
        "public_members_url": "https://api.github.com/orgs/gaia-adm/public_members{/member}",
        "avatar_url": "https://avatars.githubusercontent.com/u/12234526?v=3",
        "description": ""
    },
    "sender": {
        "login": "boriska70",
        "id": 1925917,
        "avatar_url": "https://avatars.githubusercontent.com/u/1925917?v=3",
        "gravatar_id": "",
        "url": "https://api.github.com/users/boriska70",
        "html_url": "https://github.com/boriska70",
        "followers_url": "https://api.github.com/users/boriska70/followers",
        "following_url": "https://api.github.com/users/boriska70/following{/other_user}",
        "gists_url": "https://api.github.com/users/boriska70/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/boriska70/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/boriska70/subscriptions",
        "organizations_url": "https://api.github.com/users/boriska70/orgs",
        "repos_url": "https://api.github.com/users/boriska70/repos",
        "events_url": "https://api.github.com/users/boriska70/events{/privacy}",
        "received_events_url": "https://api.github.com/users/boriska70/received_events",
        "type": "User",
        "site_admin": false
    }
};

var start = Date.now();

describe('webhook tests', function () {

    before(function () {
        if ((!process.env.ETCD_SERVER)) {
            process.env.ETCD_SERVER = 'localhost:4001';
        }
        if ((!process.env.AMQ_USER)) {
            process.env.AMQ_USER = 'admin';
        }
        if ((!process.env.AMQ_PASSWORD)) {
            process.env.AMQ_PASSWORD = 'admin';
        }
        if ((!process.env.AMQ_SERVER)) {
            process.env.AMQ_SERVER = 'localhost:5672';
        }
        if ((!process.env.AUTH_SERVER)) {
            process.env.AUTH_SERVER = 'localhost:9001';
        }

        var server = require('../../server');

    });

    describe('test', function () {

        var adminName = Date.now();
        var clientId = adminName;
        var tenantId, accessToken, webHookToken;
        var initialWebhookUrl, initialDatasource, initialEventType;
        var githubTimestampField='commits[*].timestamp';

        it('# create tenant', function (done) {
            var options = {
                url: 'http://' + process.env.AUTH_SERVER + '/sts/tenant',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                json: {"adminUserName": adminName}
            };

            request.post(options, function (err, res, body) {
                expect(res.statusCode).to.equal(201);
                done();
            });
        });
        it('# get tenant id', function (done) {
            var options = {
                url: 'http://' + process.env.AUTH_SERVER + '/sts/tenant?user=' + adminName,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };

            request.get(options, function (err, res, body) {
                expect(res.statusCode).to.equal(200);
                tenantId = JSON.parse(body).tenantId;
                console.log('TENANT ID: ' + tenantId);
                done();
            });
        });
        it('# create client', function (done) {
            var options = {
                url: 'http://' + process.env.AUTH_SERVER + '/sts/oauth/client',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                json: {
                    "client_id": clientId,
                    "client_secret": "secret",
                    "scope": "read,write,trust",
                    "authorized_grant_types": "client_credentials",
                    "authorities": "ROLE_APP",
                    "tenantId": tenantId
                }
            };
            request.post(options, function (err, res, body) {
                expect(res.statusCode).to.equal(201);
                console.log('Client ' + clientId);
                done();
            });
        });
        it('# create token', function (done) {
            var options = {
                url: 'http://' + process.env.AUTH_SERVER + '/sts/oauth/token?grant_type=client_credentials&client_id=' + clientId + '&client_secret=secret',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            };
            request.post(options, function (err, res, body) {
                expect(res.statusCode).to.equal(200);
                var jsonBody = JSON.parse(body);
                expect(jsonBody.tenantId).to.equal(tenantId);
                accessToken = jsonBody.access_token;
                console.log('Token:' + accessToken);
                done();
            });
        });

        it('# generate invalid web hook - event field is missing', function (done) {

            var options = {
                url: 'http://localhost:3000/wh/config',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                },
                json: {
                    'datasource': 'github'
                }
            };

            request.post(options, function (err, res, body) {
                expect(res.statusCode).to.equal(400);
                done();
            });
        });

        it('# generate web hook', function (done) {

            var options = {
                url: 'http://localhost:3000/wh/config',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                },
                json: {
                    'datasource': 'github',
                    'event': 'push'
                }
            };

            request.post(options, function (err, res, body) {
                expect(res.statusCode).to.equal(200);
                webHookToken = body.token;
                //returned URL is aligned for proxied environment
                expect(body.hookUrl).to.equal('https://webhook.localhost:3000/wh/' + accessToken + '/' + webHookToken);
                expect(body.tenantId).to.equal(tenantId);
                expect(body.datasource).to.equal('github');
                expect(body.eventType).to.equal('push');
                initialWebhookUrl = 'https://localhost:3000/wh/' + accessToken + '/' + webHookToken;
                initialDatasource = body.datasource;
                initialEventType = body.eventType;
                done();
            });
        });

        it('# validate url', function (done) {
            var options = {
                url: 'http://localhost:3000/wh/' + accessToken + '/' + webHookToken,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
            };
            console.log('OPTIONS: ' + JSON.stringify(options));
            request.head(options, function (err, res) {
                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('# push data', function (done) {

            var options = {
                url: 'http://localhost:3000/wh/' + accessToken + '/' + webHookToken,
                headers: eventHeaders,
                json: eventContent
            };
            console.log('OPTIONS: ' + JSON.stringify(options));
            request.post(options, function (err, res, body) {
                expect(res.statusCode).to.equal(204);
                done();
            });

        });

        it('# push data with INVALID hook token', function (done) {

            var options = {
                url: 'http://localhost:3000/wh/' + accessToken + '/' + webHookToken + 'a',
                headers: eventHeaders,
                json: eventContent
            };
            console.log('OPTIONS: ' + JSON.stringify(options));
            request.post(options, function (err, res, body) {
                expect(res.statusCode).to.equal(400);
                done();
            });
            var end = Date.now();
            console.log('Duration: ' + (end - start));
        });

        //when update the existing WH configuration, the only thing that can change is a timestamp field definiton
        it("# add timestamp field to the webhook definition", function(done){
            var options = {
                url: 'http://localhost:3000/wh/config',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                },
                json: {
                    'datasource': 'github',
                    'event': 'push',
                    'tsField': githubTimestampField
                }
            };

            request.post(options, function (err, res, body) {
                expect(res.statusCode).to.equal(200);
                webHookToken = body.token;
                expect(body.hookUrl).to.equal(initialWebhookUrl);
                expect(body.tenantId).to.equal(tenantId);
                expect(body.datasource).to.equal(initialDatasource);
                expect(body.eventType).to.equal(initialEventType);
                expect(body.tsField).to.equal(githubTimestampField);
                done();
            });
        });

        //when tsField is not provided on update, we continue use the existing one
        it("# keep using the existing timestamp field on update", function(done){
            var options = {
                url: 'http://localhost:3000/wh/config',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                },
                json: {
                    'datasource': 'github',
                    'event': 'push'
                }
            };

            request.post(options, function (err, res, body) {
                expect(res.statusCode).to.equal(200);
                webHookToken = body.token;
                expect(body.hookUrl).to.equal(initialWebhookUrl);
                expect(body.tenantId).to.equal(tenantId);
                expect(body.datasource).to.equal(initialDatasource);
                expect(body.eventType).to.equal(initialEventType);
                expect(body.tsField).to.equal(githubTimestampField);
                done();
            });
        });

        //when tsField is provided on update, and set to empty string explicitly we continue use the existing one
        it("# keep using the existing timestamp field on update", function(done){
            var options = {
                url: 'http://localhost:3000/wh/config',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': 'Bearer ' + accessToken
                },
                json: {
                    'datasource': 'github',
                    'event': 'push',
                    'tsField': ''
                }
            };

            request.post(options, function (err, res, body) {
                expect(res.statusCode).to.equal(200);
                webHookToken = body.token;
                expect(body.hookUrl).to.equal(initialWebhookUrl);
                expect(body.tenantId).to.equal(tenantId);
                expect(body.datasource).to.equal(initialDatasource);
                expect(body.eventType).to.equal(initialEventType);
                expect(body.tsField).to.empty;
                done();
            });
        });

    });


});
