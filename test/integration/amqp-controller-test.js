'use strict';
var chai = require("chai");
var assert = chai.assert;
var amqp = require('amqplib');
var notification = require("./../../controllers/amqp-controller");

var Q = require('q');

describe('notification tests', function () {
    var amqConn;
    var amqCh;
    var RABBIT_TIMEOUT_MSEC = 3000;
    var amqQueue = 'notification-test-queue';
    var routingKey = amqQueue;
    var eventHeaders = {
        'Request URL': 'https://circleci.com/hooks/github',
        'Request method': 'POST',
        'content-type': 'application/x-www-form-urlencoded',
        'Expect': 'User-Agent: GitHub-Hookshot/f671e41',
        'X-GitHub-Delivery': '741e6b80-9f32-11e5-8f65-521db3377f06',
        'X-GitHub-Event': 'push',
        'X-Hub-Signature': 'sha1=8eb2fc22c38d33fc3869e192b11666f20bcdec55'
    };
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

    before(function (done) {
        if ((!process.env.AMQ_USER)) {
            process.env.AMQ_USER = 'admin';
        }
        if ((!process.env.AMQ_PASSWORD)) {
            process.env.AMQ_PASSWORD = 'admin';
        }
        if ((!process.env.AMQ_SERVER)) {
            process.env.AMQ_SERVER = 'localhost:5672';
        }
        notification.initAmq(false).done(function onOk() {
            done();
        }, function onError(err) {
            assert.fail(err, null, 'Failed to init notification module');
        });
    });

    beforeEach(function (done) {
        amqp.connect(getAmqUrl()).then(function (conn) {
            return conn.createChannel().then(function (ch) {
                amqCh = ch;
                return ch.assertQueue(amqQueue, {
                    exclusive: false,
                    durable: false,
                    autoDelete: false
                }).then(function () {
                    done();
                });
            });
        }, function (err) {
            assert.fail(err, null, 'Failed to connect to AMQ');
        });
    });

    afterEach(function () {
        if (amqConn) {
            amqConn.close();
        }
    });

    after(function (done) {
        notification.shutdown().done(function onOk() {
            done();
        }, function onError(err) {
            assert.fail(err, null, 'Failed to disconnect from AMQ');
        });
    });

    it('#send notification must succeed', function () {
        return notification.sendToIndexer(eventHeaders, eventContent).timeout(RABBIT_TIMEOUT_MSEC).then(function () {
        }, function (err) {
            assert.fail(true, false, 'problem: ' + err.message);
        }).fail(function (error) {
            assert.fail(error, null, error.message);
        });
    });

    function getAmqUrl() {
        if (!process.env.AMQ_USER) {
            throw new Error('AMQ_USER environment variable is not specified');
        }
        var pwd = process.env.AMQ_PASSWORD ? process.env.AMQ_PASSWORD : '';
        return 'amqp://' + process.env.AMQ_USER + ':' + pwd +
            '@' + getAmqServer() + '?frameMax=0x1000&heartbeat=30';
    }

    /**
     * Returns hostname:port of RabbitMQ server.
     */
    function getAmqServer() {
        if (!process.env.AMQ_SERVER) {
            throw new Error('AMQ_SERVER environment variable is not specified');
        }
        return process.env.AMQ_SERVER;
    }

})
;
