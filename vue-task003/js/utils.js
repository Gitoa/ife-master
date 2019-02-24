async function updateFilesArray(config) {//更新当前文件夹/添加文件的目标文件夹下的文件信息
    let result = await readData(config.database, config.currentFolder);
    let newFilesInFolder = result.content.map(function(item, index) {
        return item.name;
    })
    config.filesInFolder = newFilesInFolder;

    let resultF = await readData(config.database, config.addFilePath);
    let newFilesInFilePath = resultF.content.map(function(item, index) {
        return item.name;
    })
    config.filesInFilePath = newFilesInFilePath;
}

async function updatePathData(database, pathData, path, type) {//初始化时需要将database内容取到pathData中用于数据绑定
    let result = await readData(database, path);
    let content = result.content;
    pathData.set(path, content);
    if(type === 0) {
        for(let file of content) {
            await updatePathData(database, pathData, path+'/'+file.name, file.type);
        }
    } else if(type === 1) {
        for(let task of content) {
            await updatePathData(database, pathData, path+'/'+task.name, task.type);
        }
    }
}

async function updateTaskInfo(config) {//更新对应的任务信息
    let result = await readData(config.database, config.folderOfFile + '/' + config.currentFileName +'/' + config.taskName);
    config.taskInfo = {
        name: result.content.name,
        date: result.content.date,
        content: result.content.content,
        done: result.content.done,
        type: result.content.type
    }
}

async function initConfig(config) {
    await updateFilesArray(config);
}

async function updateTasksInFile(config) {//切换文件时更新当前文件下的任务,同时更新tasksByDate
    let newTasksList = [];
    let newTasksByDate = new Map();
    let fullPath = config.folderOfFiles+'/'+config.currentFileName;
    let result = await readData(config.database, fullPath);
    let fileContent = result.content;
    for(let task of fileContent) {
        if(newTasksByDate.has(task.date)) {
            newTasksByDate.get(task.date).push({name:task.name, done:task.done})
        }
        newTasksList.push(task.name);
    }
    config.tasksByDate = newTasksByDate;
    config.tasksInFile = newTasksList;
}

async function updateTaskInfo(config) {//更新当前显示的任务内容
    let taskInfo = await readData(config.database, config.folderOfFile+'/'+config.currentFileName+'/'+config.taskName);
    taskInfo = taskInfo.content;
    let newInfo = {
        name: taskInfo.name,
        date: taskInfo.date,
        content: taskInfo.content,
        done: taskInfo.done
    }
    config.taskInfo = newInfo;
}

async function classClick(event, config) {
    if(event.target.classList.contains('deleteBtn')) {  //说明是删除操作
        let pNode = event.target.parentNode;
        let fullPath;
        if(pNode.classList.contain('file')) {  //说明是删除文件
            let fileName = pNode.querySelector('.fileName').innerText;
            pNode = pNode.parentNode.parentNode.parentNode;
            let folderPath = pNode.querySelector('.folderInfo .folderName').innerText;
            while(!pNode.classList.contains('topFolder')) {
                pNode = pNode.parentNode;
                if(pNode.classList.contains('isfolder')) {
                    folderPath = pNode.querySelector('.folderName').innerText + '/' + folderPath;
                }
            }
            fullPath = folderPath + '/' + fileName;
            await removeData(config, fullPath, 1);
            if(fullPath === (config.folderOfFile + '/' + config.currentFileName)) {  //说明删除的是当前访问的文件
                config.folderOfFile = '';
                config.fileName = '';
                config.tasksByDate = new Map();
                config.currentFileName = '';
                config.taskName = '';
                config.taskInfo = {};
                config.taskNode = null;
                config.tasksInFile = [];
                clearTaskMain();
            }
        } else if(pNode.classList.contains('folderInfo')){  //说明是删除文件夹
                let folderPath = pNode.querySelector('.folderName').innerText;
                pNode = pNode.parentNode;
                while(!pNode.classList.contains('topFolder')) {
                    pNode = pNode.parentNode;
                    if(pNode.classList.contains('isfolder')) {
                        folderPath = pNode.querySelector('.folderName').innerText + '/' + folderPath;
                    }
                }
                fullPath = folderPath;
                await removeData(config, fullPath, 0);
                //若删除的文件夹包含当前正在操作的文件
                let pathPattern = new RegExp('^'+fullPath, 'g');
                if(pathPattern.test(config.folderOfFile)){
                    //将任务集合置空，文件置空，文件所在目录置空，任务总体栏置空，取消对任务的submit/cancel操作
                    config.currentTasks = new Map();
                    config.currentFileName = '';
                    config.folderOfFile = '';
                    config.taskName = '';
                    config.taskInfo = {};
                    config.taskNode = {};
                    config.tasksInFile = [];
                    config.tasksByDate = new Map();
                    clearTaskMain();
                }
                if(pathPattern.test(config.currentFolder)) { 
                    config.currentFolder = '/';
                }
                if(pathPattern.test(config.addFilePath)) {
                    config.addFilePath = '默认分类'
                }
        }
    } else {
        if(event.target.classList.contains('fileName') || event.target.classList.contains('file')) {  //说明点击的是文件
            //获得文件路径
            let fullPath;
            let pNode = event.target;
            if(!pNode.classList.contains('file')) {
                pNode = pNode.parentNode;
            }
            let fileNode = pNode.cloneNode();
            let fileName = pNode.querySelector('.fileName').innerText;
            pNode = pNode.parentNode.parentNode.parentNode;
            let folderPath = pNode.querySelector('.folderInfo .folderName').innerText;
            while(!pNode.classList.contains('topFolder')) {
                pNode = pNode.parentNode;
                if(pNode.classList.contains('isfolder')) {
                    folderPath = pNode.querySelector('.fileName').innerText + '/' + folderPath;
                }
            }
            fullPath = folderPath + '/' + fileName;
            //切换任务栏展示的任务，更新当前config.folderOfFile(当前任务栏的父文件夹路径)
            config.folderOfFile = folderPath;
            config.currentFolder = folderPath;
            config.addFilePath = folderPath;
            config.currentFileName = fileName;
            if(config.folderOrFileNode instanceof HTMLElement) {
                config.folderOrFileNode.classList.remove('show');
            }
            config.folderOrFileNode = fileNode;
            config.folderOrFileNode.classList.add('show');
            updateTasksInFile(config);
        } else if(event.target.classList.contains('folderImg') || event.target.classList.contains('folderName') || event.target.classList.contains('folderInfo')) {
            //此时点击的是文件夹目录
            //切换目录的展开状态
            let folderInfo = event.target;
            if(!folderInfo.classList.contains('folderInfo')) {
                folderInfo = folderInfo.parentNode;
            }
            folderInfo.classList.toggle('open');
            folderInfo.classList.toggle('closed');
            folderInfo.parentNode.classList.toggle('open');
            folderInfo.parentNode.classList.toggle('closed');
            //更新当前目录路径config.currentFolder、增加文件的路径config.addFilePath
            let folderPath = folderInfo.querySelector('.folderName').innerText;
            let pNode = folderInfo.parentNode;
            if(folderPath === '分类列表') {
                config.currentFolder = '/';
                config.addFilePath = config.defaultFilePath;
            } else {
                while(!pNode.classList.contains('topFolder')) {
                    pNode = pNode.parentNode;
                    if(pNode.classList.contains('isfolder')) {
                        folderPath = pNode.querySelector('.folderName').innerText + '/' + folderPath;
                    }
                }
                config.currentFolder = folderPath;
                config.addFilePath = folderPath;
            }
            if(config.folderOrFileNode instanceof HTMLElement) {
                config.folderOrFileNode.classList.remove('show');
            }
            config.folderOrFileNode = folderInfo;
            config.folderOrFileNode.classList.add('show');
        } else {  //此次点击不在文件夹和文件上，需要更新文件夹路径(在该路径下增加文件夹)与文件路径(在该目录下增加文件)
            config.currentFolder = '/';
            config.addFilePath = config.defaultFilePath;
            if(config.folderOrFileNode instanceof HTMLElement) {
                console.log(config.folderOrFileNode);
                config.folderOrFileNode.classList.remove('show');
            }
            config.folderOrFileNode = {};
        }
        console.log(config.currentFolder, config.addFilePath);
    }
    if(config.currentFolder === '默认分类') {
        document.querySelector('#addFolder').setAttribute('disabled', true);
    } else {
        document.querySelector('#addFolder').removeAttribute('disabled');
    }
    await updateFilesArray(config);
}

async function taskClick(event, config) {  //点击了任务，更新config中路径，更新显示的任务内容
    if(event.target.classList.contains('singleTask')) {
        let taskName = event.target.innerText;
        let fullPath = config.folderOfFile + '/' + config.currentFileName + '/' + taskName;
        let result = await readData(config.database, fullPath);
        config.taskInfo = {name:result.content.name, date:result.content.date, done:result.content.done, content:result.content.content, type:result.content.type};
        if(config.taskNode) {
            config.taskNode.classList.remove('show');
        }
        config.taskNode = event.target;
        config.taskNoe.classList.add('show');
        updateTaskInfo(config);
    }
}

function clearTaskMain() {  //重置任务名任务时间任务内容，并且取消各项操作
    document.querySelector('#taskName').innerHTML = '任务名';
    let taskDate = document.querySelector('#taskDate');
    taskDate.data = '';
    taskDate.readonly = 'true';
    let taskContent = document.querySelector('#taskContent');
    taskContent.data = '';
    taskContent.readonly = 'true';
    document.querySelector('#submit').setAttribute('disabled', 'true');
    document.querySelector('#cancel').setAttribute('disabled', 'true');
    let taskMainOps = document.querySelector('#taskMainOps');
    taskMainOps.setAttribute('style', 'display:none');
}

function disableTaskMainOps() {
    let taskMainOps = document.querySelector('#taskMainOps');
    taskMainOps.setAttribute('style', 'display:none');
}

function ableTaskMainOps() {
    let taskMainOps = document.querySelector('#taskMainOps');
    taskMainOps.removeAttribute('style');
}

function activeEdit() {  //进入编辑模式，submit/cancel激活，编辑按钮和完成按钮disabled，内容可编辑
    disableTaskMainOps();
    config.preTaskContent = config.taskInfo.content;
    let taskDate = document.querySelector('#taskDate');
    taskDate.readonly = 'true';
    let taskContent = document.querySelector('#taskContent');
    taskContent.readonly = '';
    taskContent.focus();
    document.querySelector('#submit').setAttribute('disabled', 'false');
    document.querySelector('#cancel').setAttribute('disabled', 'false');    
}

async function addClass(config, className) {  //添加文件夹
    let path = config.currentFolder;
    let data = {name:className, type:0, tasksNum:0};
    await addData(config, path, data);
    if(path === '/') {  //说明添加的是topFolder
        config.topFolder.push(className);
    }
}

async function addFile(config, fileName) {
    let path = config.addFilePath;
    let data = {name:fileName, type:1, tasksNum:0};
    await addData(config, path, data);
}

async function addTask(config, taskName, taskDate) {  //添加任务，进入任务编辑，同时提交空的数据，submit时再更新
    disableTaskMainOps();
    let path = config.folderOfFile + '/' + config.currentFileName;
    let data = {name:taskName, type:2, date:taskDate, content:'', done:false}
    await addData(config, path, data);
    document.querySelector('#taskName').innerHTML = taskName;
    let taskDate = document.querySelector('#taskDate');
    taskDate.readonly = 'true';
    taskDate.data = taskDate;
    activeEdit();
}

async function submitTask(config, taskName, taskDate, taskContent) {
    let path = config.folderOfFile + '/' + config.currentFileName;
    let data = {name:taskName, type:2, date:taskDate, content:taskContent, done:false}
    await putData(config.database, path+'/'+data.name, data, 1);
    document.querySelector('#submit').setAttribute('disabled', 'true');
    document.querySelector('#cancel').setAttribute('disabled', 'true');
    ableTaskMainOps();
}

function cancelTask(config) {  //取消对content的修改,重置内容
    document.querySelector('#submit').setAttribute('disabled', 'true');
    document.querySelector('#cancel').setAttribute('disabled', 'true');
    ableTaskMainOps();
    config.taskInfo.content = config.preTaskContent;
}

async function checkTask(config) {  //将当前任务标记为完成
    config.taskInfo.done = true;
    await putData(config.database, config.folderOfFile+'/'+config.currentFileName+'/'+config.taskName, config.taskInfo, 0);
    await updateTasksNum(config.database, config.folderOfFile+'/'+config.currentFileName, -1);
}


