'use strict';
module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        //jshint
        jshint: {
            all: ['controllers/*.js', 'controllers/tasks-config.js', 'helpers/*.js'], options: {
                jshintrc: true
            }
        },
        //mocha
        mochaTest: {
            unit: {
                options: {
                    reporter: 'mocha-junit-reporter',
                    //captureFile: 'unit-test-results.txt',
                    reporterOptions: {
                        mochaFile: 'unit-test-results.xml'
                    },
                    quiet: false,
                    clearRequireCache: false
                },
                src: ['test/unit/**/*-test.js']
            },
            integration: {
                options: {
                    reporter: 'mocha-junit-reporter',
                    reporterOptions: {
                        mochaFile: 'integration-test-results.xml'
                    },
                    quiet: false,
                    clearRequireCache: false
                }, src: ['test/integration/**/*-test.js']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');

    grunt.registerTask('unit', 'mochaTest:unit');
    grunt.registerTask('integration', 'mochaTest:integration');
    //grunt.registerTask('default', 'mochaTest:unittest');  //align with result-processing format - no default task
};