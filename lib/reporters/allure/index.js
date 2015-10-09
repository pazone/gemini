var RunnerEvents = require('../../constants/runner-events'),
    Allure = require('allure-js-commons'),
    Attachment = require('allure-js-commons/beans/attachment'),
    writer = require('allure-js-commons/writer'),
    allureReporter = new Allure(),
    fs = require('fs'),
    lib = require('./../lib'),
    q = require('q');


function AllureReporter(runner) {

    //console.log('[RUNNER: ', runner);

    var suites = {};


    runner.on(RunnerEvents.BEGIN_SUITE, function(result) {
        var sutePath = result.suite.path.join('/');
        console.log(sutePath);
        allureReporter.startSuite(sutePath);
        suites[sutePath] = q();
    });

    runner.on(RunnerEvents.END_SUITE, function(result) {
        suites[result.suite.path.join('/')].then(function() {
            allureReporter.endSuite();
        });
    });

    runner.on(RunnerEvents.END_TEST, function(result) {
        allureReporter.startCase(result.state.name);
        if (result.equal) {
            allureReporter.addAttachment('actual', fs.readFileSync(result.currentPath), 'image/png');
            allureReporter.endCase('passed');
        } else {
            console.log('failed test', result.state.name);
            var currentTest = allureReporter.getCurrentSuite().currentTest;
            var tmp = result.currentPath + 'tmpDiff.png';
            allureReporter.addAttachment('actual', fs.readFileSync(result.currentPath), 'image/png');
            allureReporter.addAttachment('expected', fs.readFileSync(result.referencePath), 'image/png');
            var sutePath = result.suite.path.join('/');
            suites[sutePath] = suites[sutePath].then(function() {
                console.log('saving diff', result.state.name);
                return result.saveDiffTo(tmp).then(function() {
                    var buffer = fs.readFileSync(tmp);
                    var name = writer.writeBuffer(allureReporter.options.targetDir, buffer, '.png'),
                        attachment = new Attachment('diff', name, buffer.length, 'image/png');
                    currentTest.addAttachment(attachment);
                    console.log('diff done', result.state.name);
                });
            }, function(e) {
                console.log(e);
            });
            allureReporter.endCase('failed', new Error('screenshots not match'));
        }
    });

}

module.exports = AllureReporter;