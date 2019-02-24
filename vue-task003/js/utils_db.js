function initDB(name, ver, resolve, config) {
    let indexedDB = window.indexedDB || window.msIndexedDB || window.webkitIndexedDB || window.mozIndexedDB;
    let database;
    let request = indexedDB.open(name);
    request.onerror = function(event) {
        console.log('open failed');
    }
    request.onsuccess = function(event) {
        console.log('open success');
        database = event.target.result;
        if(config.initDBFlag) {
            config.initDBFlag = false;
            let initRequest = database.transaction(['path'], 'readwrite').objectStore('path').add({path:'/', content:[{name:'默认分类', type:0}], taskNum:0});
            initRequest.onerror = function() {
                console.log('init falsed');
            }
            initRequest.onsuccess = function(event) {
                console.log('初始化初始目录成功');
            }
            let defaultRequest = database.transaction(['path'], 'readwrite').objectStore('path').add({path:'默认分类', content:[], tasksNum:0});
            defaultRequest.onerror = function() {
                console.log('初始化默认目录失败');
            }
            defaultRequest.onsuccess = function() {
                console.log('初始化默认目录成功');
            }
        }
        config.database = database;
        resolve();
    }
    request.onupgradeneeded = function(event) {
        database = event.target.result;
        if(!database.objectStoreNames.contains('path')) {
            config.initDBFlag = true;
            pathStore = database.createObjectStore('path', {keyPath:'path'});
            pathStore.createIndex('path', 'path', {unique: true});
            pathStore.createIndex('content', 'content', {unique: false});
            pathStore.createIndex('tasksNum', 'tasksNum', {unique: false});
        }
    }
}

function readData(database, path) {  //database为目标数据库，path为完整的路径
    console.log(database);
    return new Promise((resolve, reject) => {
        var request = database.transaction('path').objectStore('path').get(path);
        request.onerror = function(event) {
            reject(event.target.errorCode)
        }
        request.onsuccess = function(event) {
            resolve(event.target.result);
        }
    })
}

function putData(database, path, content, tasksNum) {  //更新path对应的数据，一般在添加删除操作中更新content以及tasksNum
    return new Promise((resolve, reject) => {
        var request = database.transaction('path', 'readwrite').objectStore('path').put({path:path, content:content, tasksNum:tasksNum});
        request.onerror = function(event) {
            reject(event.target.errorCode);
        };
        request.onsuccess = function(event) {
            resolve(event.target.result);
        }
    })
}

function deletePath(database, path) {  //从数据库中删除对应path
    return new Promise((resolve, reject) => {
        let request = database.transaction('path', 'readwrite').objectStore('path').delete(path);
        request.onerror = function(event) {
            reject(event.target.errorCode);
        }
        request.onsuccess = function(event) {
            resolve(event.target.result);
        }
    })
}

async function updateTasksNum(database, path, num) {  //沿着path，更新tasksNum，包含path
    while(path && num!==0) {
        let data = await readData(database, path);
        let [content, tasksNum] = data;
        tasksNum += num;
        await putData(database, path, content, tasksNum);
        path = path.slice(0, path.lastIndexOf('/'));
    }
}

async function addData(config, path, data) {  
    //该操作需要改变数据库，config为包含数据库的对象，path为添加的数据所在的路径，data为添加的数据
    //文件夹{name:name, type:0, tasksNum:0},文件{name:name, type:1, tasksNum:0},任务{name:name, type:2, date:date, content:content, done:false}
    if(data.type === 2) {  //1.往数据库中插入任务信息，2.往文件中添加任务，3.更新路径上所有的tasksNum
        //插入任务信息
        let taskPath = path + '/' + data.name;
        await putData(config.database, taskPath, data, 1);
        //更新文件content和tasksNum
        let result = await readData(config.database, path);
        let content = result.content, tasksNum = result.tasksNum;
        tasksNum = tasksNum + 1;
        let taskData = {name:data.name, date:data.date, done:data.done, type:data.type};
        content.push(taskData);
        await putData(config.database, path, content, tasksNum);
        //更新路径上的tasksNum  
        let folderPath = path.slice(0, path.lastIndexOf('/'));
        await updateTasksNum(config.database, folderPath, 1);
    }
    else if(data.type === 1) {  //1.往数据库中插入文件信息， 2.往上级文件夹中添加文件
        //插入文件
        let filePath = path + '/' + data.name;
        await putData(config.database, filePath, [], 0);
        //更新上一级文件夹content
        let folderData = await readData(config.database, path);
        let {content, tasksNum} = folderData;
        content.push(data);
        content.sort(function(a, b) {
            return a.type - b.type;
        })
        await putData(config.database, path, content, tasksNum);
    }
    else if(data.type === 0) {  //1.往数据库中插入文件夹信息， 2.往上级文件夹中添加文件夹
        let folderPath;
        if(path === '/') {  //添加的是topFolder
            folderPath = data.name;
        } else {
            folderPath = path + '/' + data.name;
        }
        await putData(config.database, folderPath, [], 0);
        let parentData = await readData(config.database, path);
        let {content, tasksNum} = parentData;
        content.push(data);
        content.sort(function(a, b) {
            return a.type - b.type;
        });
        await putData(config.database, path, content, tasksNum);
    }
}

async function removeData(config, path, type){  //移除路径为path的（文件夹/文件/任务）
    if(type === 0) {  //移除文件夹，1.递归将文件夹下文件删除， 2.将本文件夹删除， 3.从父文件夹中移除，并更新tasksNum，路径上所有文件夹都要更新
        let result = await readData(config.database, path);
        let {content, tasksNum} = result;
        for(let file of content) {
            await removeData(config, path+'/'+file.name, file.type);
        }
        await deletePath(config.database, path);
        let parentPath ,name;
        if(path.indexOf('/')===-1) {
            parentPath = '/';
            name = path;
        } else {
            parentPath = path.slice(0, path.lastIndexOf('/'));
            name = path.slice(path.lastIndexOf('/')+1);
        }
        let parentData = await readData(config.database, parentPath);
        let {pContent, pTasksNum} = parentData;
        let pos = -1;
        for(let i=0; i<pContent.length; i++) {
            if(pConent[i].name === name) {
                pos = i;
                break;
            }
        }
        pContent.splice(pos, 1);
        if(parentPath === '/') {  //说明删除的是topFolder
            config.topFolder = pContent.map(function(item) {
                return item.name;
            })
        }
        pTasksNum -= tasksNum;
        await putData(config.database, parentPath, pContent, pTasksNum);
        let gpPath = parentPath.slice(0, parentPath.lastIndexOf('/'));
        await updateTasksNum(config.database, gpPath, -tasksNum)
    } else if(type === 1) {  //移除文件，1.递归将文件下任务删除， 2.将本文件删除， 3.从父文件夹中删除，并更新tasksNum
        let result = await readData(config.database, path);
        let {content, tasksNum} = result;
        for(let task of content) {
            await removeData(config, path+'/'+task.name, task.type);
        }
        await deletePath(config.database, path);
        let parentPath, name;
        parentPath = path.slice(0, path.lastIndexOf('/'));
        name = path.slice(path.lastIndexOf('/')+1);
        let parentData = await readData(config.database, parentPath);
        let {pContent, pTasksNum} = parentData;
        let pos = -1;
        for(let i=0; i<pContent.length; i++) {
            if(pContent[i].name === name) {
                pos = i;
                break;
            }
        }
        pContent.splice(pos, 1);
        pTasksNum -= tasksNum;
        await putData(config.database, parentPath, pContent, pTasksNum);
        let gpPath = parentPath.slice(0, parentPath.lastIndexOf('/'));
        await updateTasksNum(config.database, gpPath, -tasksNum);
    } else if(type === 2) {  //移除任务， 1.将本任务删除， 2.从父文件中删除该任务，并更新tasksNum
        let result = await readData(config.database, path);
        let {taskNum} = result;
        await deletePath(config.database, path);
        let name = path.slice(path.lastIndexOf('/')+1);
        let parentPath = path.slice(0, path.lastIndexOf('/'));
        let parentData = await readData(config.database, parentPath);
        let {pContent, pTasksNum} = parentData;
        let pos = -1;
        for(let i=0; i<pContent.length; i++) {
            if(pContent[i].name === name) {
                pos = i;
                break;
            }
        }
        pContent.splice(pos, 1);
        pTasksNum -= tasksNum;
        await putData(config.database, parentPath, pContent, pTasksNum);
        let gpPath = parentPath.slice(0, parentPath.lastIndexOf('/'));
        await updateTasksNum(config.database, gpPath, -tasksNum0);
    }
}



