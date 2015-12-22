'use strict';

function CollectionTask(providerType, providerProps, runPeriod,credentialsId){
    this.providerType = providerType;
    this.providerProps = providerProps;
    this.runPeriod = runPeriod;
    this.credentialsId = credentialsId;
}


module.exports = CollectionTask;