function updateFilesArray(config) {//更新当前文件夹/添加文件的目标文件夹下的文件信息
    let result = config.pathData.get(config.currentFolder);
    let newFilesInFolder = result.content.map(function(item, index) {
        return item.name;
    })
    config.filesInFolder = newFilesInFolder;

    let resultF = config.pathData.get(config.addFilePath);
    let newFilesInFilePath = resultF.content.map(function(item, index) {
        return item.name;
    })
    config.filesInFilePath = newFilesInFilePath;
}

async function updatePathData(database, pathData, path, type) {//初始化时需要将database内容取到pathData中用于数据绑定
    let result = await readData(database, path);
    let content = result.content;
    pathData.set(path, {tasksNum:result.tasksNum, content:content});
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

function initConfig(config) {
    updateFilesArray(config);
}

function updateData(config) {//hack方法用于同步Vue和Map类型变化
    config.updateCount.count += 1;
    config.updateCount.count %= 100;
}

function updateTasksNumInPathData(pathData, folderPath, num) {  //对pathData中路径上各项的任务数进行更新，包含foldePath
    let path = folderPath;
    while(path) {
        pathData.get(path).tasksNum += num;
        path = path.substr(0, path.lastIndexOf('/'));
    }
}

function addPathData(config, path, data) {//往数据库中添加文件时同步到pathData中,写法同addData
    let pathData = config.pathData;
    let content = pathData.get(path).content;
    if(data.type === 2) {  //说明是任务
        let taskPath = path + '/' + data.name;
        content.push(data);
        pathData.set(taskPath, {tasksNum:1, content:data});
        updateTasksNumInPathData(config.pathData, path, 1);
    } else if(data.type === 1) {  //说明是文件
        let filePath = path + '/' + data.name;
        content.push(data);
        content.sort(function(a, b) {
            return a.type - b.type;
        })
        pathData.set(filePath, {tasksNum:0, content:[]});
    } else if(data.type === 0) {
        let folderPath;
        if(path === '/') {
            folderPath = data.name;
        } else {
            folderPath = path + '/' + data.name;
        }
        content.push(data);
        content.sort(function(a, b) {
            return a.type - b.type;
        })
        pathData.set(folderPath, {tasksNum:0, content:[]});
    }
}

function delPathData(pathData, path, type) {  //移除路径path下对应在pathData中的数据
    let content = pathData.get(path).content;
    if(type === 0) {  //移除的是文件夹
        for(let file of content) {
            delPathData(path + '/' + file.name, file.type);
        }
        pathData.delete(path);
    } else if(type === 1) {
        for(let task of content) {
            delPathData(pathData, path + '/' + task.name, task.type);
        }
        pathData.delete(path);
    } else if(type === 2) {
        pathData.delete(path);
    }
}

function delFromParentInPathData(pathData, folderPath, fileName, tasksNum){
    let data = pathData.get(folderPath);
    let content = data.content;
    let pos = -1;
    for(let i=0; i<content.length; i++) {
        if(content[i].name === fileName) {
            pos = i;
            break;
        }
    }
    content.splice(pos, 1);
    data.tasksNum -= tasksNum;
    let gpPath = folderPath.substr(0, folderPath.lastIndexOf('/'));
    updateTasksNumInPathData(pathData, gpPath, -tasksNum);
}

function updateTasksInFile(config) {//切换文件时更新当前文件下的任务,同时更新tasksByDate
    let newTasksList = [];
    let newTasksByDate = new Map();
    let fullPath = config.folderOfFile+'/'+config.currentFileName;
    let result = config.pathData.get(fullPath);
    let fileContent = result.content;
    fileContent.sort(function(a, b) {
        return a.date > b.date ? 1 : -1;
    })
    for(let task of fileContent) {
        if(newTasksByDate.has(task.date)) {
            newTasksByDate.get(task.date).push({name:task.name, done:task.done})
        } else {
            newTasksByDate.set(task.date, [{name:task.name, done:task.done}]);
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
        if(pNode.classList.contains('file')) {  //说明是删除文件
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
            let result = await readData(config.database, fullPath);
            let {tasksNum} = result;
            await removeData(config, fullPath, 1);
            //还需要从父文件夹中删除
            await delFromParent(config.database, folderPath, fileName, tasksNum);
            //更新pathData
            delPathData(config.pathData, fullPath, 1);
            delFromParentInPathData(config.pathData, folderPath, fileName, tasksNum);
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
                let folderName = folderPath;
                pNode = pNode.parentNode;
                while(!pNode.classList.contains('topFolder')) {
                    pNode = pNode.parentNode;
                    if(pNode.classList.contains('isfolder')) {
                        folderPath = pNode.querySelector('.folderName').innerText + '/' + folderPath;
                    }
                }
                fullPath = folderPath;
                let result = await readData(config.database, fullPath);
                let {tasksNum} = result;
                await removeData(config, fullPath, 0);
                //从父文件夹中删除
                let parentPath = fullPath.substr(0, fullPath.lastIndexOf('/'));
                if(!parentPath) {
                    parentPath = '/'
                }
                await delFromParent(config.database, parentPath, folderName, tasksNum);
                //在pathData中更新
                delPathData(config.pathData, fullPath, 0);
                delFromParentInPathData(config.pathData, parentPath, folderName, tasksNum);
                //若是topFolder
                if(parentPath === '/') {
                    let pos = -1;
                    for(let i=0; i<config.topFolder.length; i++) {
                        if(config.topFolder[i] === folderName) {
                            pos = i;
                            break;
                        }
                    }
                    config.topFolder.splice(pos, 1);
                }
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
        updateData(config);
    } else {
        if(event.target.classList.contains('fileName') || event.target.classList.contains('file')) {  //说明点击的是文件
            //获得文件路径
            let fullPath;
            let pNode = event.target;
            let fileNode = event.target;
            if(!pNode.classList.contains('file')) {
                pNode = pNode.parentNode;
                fileNode = fileNode.parentNode;
            }
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
            //切换任务栏展示的任务，更新当前config.folderOfFile(当前任务栏的父文件夹路径,应该是完整路径)
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
                config.folderOrFileNode.classList.remove('show');
            }
            config.folderOrFileNode = {};
        }
    }
    if(config.currentFolder === '默认分类') {
        document.querySelector('#addFolder').setAttribute('disabled', true);
    } else {
        document.querySelector('#addFolder').removeAttribute('disabled');
    }
    updateFilesArray(config);
}

function taskClick(event, config) {  //点击了任务，更新config中路径，更新显示的任务内容
    if(event.target.classList.contains('singleTask')) {
        let taskName = event.target.innerText;
        config.taskName = taskName;
        let fullPath = config.folderOfFile + '/' + config.currentFileName + '/' + taskName;
        let result = config.pathData.get(fullPath);
        config.taskInfo = {name:result.content.name, date:result.content.date, done:result.content.done, content:result.content.content, type:result.content.type};
        if(config.taskNode) {
            config.taskNode.classList.remove('show');
        }
        config.taskNode = event.target;
        config.taskNode.classList.add('show');
    }
}

function clearTaskMain() {  //重置任务名任务时间任务内容，并且取消各项操作
    document.querySelector('#taskName').innerHTML = '任务名';
    let taskDate = document.querySelector('#taskDate');
    taskDate.data = '';
    taskDate.readOnly = 'true';
    let taskContent = document.querySelector('#taskContent');
    taskContent.data = '';
    taskContent.readOnly = 'true';
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
    document.querySelector('#taskContent').readOnly = 'true';
}

function activeEdit() {  //进入编辑模式，submit/cancel激活，编辑按钮和完成按钮disabled，内容可编辑
    disableTaskMainOps();
    config.preTaskContent = config.taskInfo.content;
    let taskDate = document.querySelector('#taskDate');
    taskDate.readOnly = 'true';
    let taskContent = document.querySelector('#taskContent');
    taskContent.removeAttribute('readonly');
    taskContent.focus();
    document.querySelector('#submit').removeAttribute('disabled');
    document.querySelector('#cancel').removeAttribute('disabled');    
}

async function addClass(config, className) {  //添加文件夹
    let path = config.currentFolder;
    let data = {name:className, type:0, tasksNum:0};
    await addData(config, path, data);
    if(path === '/') {  //说明添加的是topFolder
        config.topFolder.push(className);
    }
    addPathData(config, path, data);
    updateData(config);
}

async function addFile(config, fileName) {
    let path = config.addFilePath;
    let data = {name:fileName, type:1, tasksNum:0};
    await addData(config, path, data);
    addPathData(config, path, data);
    updateData(config);
}

async function addTask(config, taskName, taskDate) {  //添加任务，进入任务编辑，同时提交空的数据，submit时再更新
    disableTaskMainOps();
    let path = config.folderOfFile + '/' + config.currentFileName;
    let data = {name:taskName, type:2, date:taskDate, content:'', done:false}
    await addData(config, path, data);
    addPathData(config, path, data);
    config.taskInfo = {
        name: taskName,
        date: taskDate,
        content: '',
        done: false,
        type: 2
    }
    let taskDateNode = document.querySelector('#taskDate');
    taskDateNode.readonly = 'true';
    updateData(config);
    updateTasksInFile(config);
    activeEdit();
    config.taskName = taskName;
}

async function submitTask(config, taskName, taskDate, taskContent) {
    let path = config.folderOfFile + '/' + config.currentFileName;
    let data = {name:taskName, type:2, date:taskDate, content:taskContent, done:false}
    await putData(config.database, path+'/'+data.name, data, 1);
    config.pathData.set(path+'/'+data.name, {content:data, tasksNum:1});
    config.taskInfo = data;
    document.querySelector('#submit').setAttribute('disabled', 'true');
    document.querySelector('#cancel').setAttribute('disabled', 'true');
    ableTaskMainOps();
    updateData(config);
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
    //还需要在文件中标记该项已完成
    let file = await readData(config.database, config.folderOfFile+'/'+config.currentFileName);
    let {content, tasksNum} = file;
    content.forEach(function(item, index) {
        if(item.name === config.taskName) {
            content[index].done = true;
        }
    })
    await putData(config.database, config.folderOfFile+'/'+config.currentFileName, content, tasksNum);
    await updateTasksNum(config.database, config.folderOfFile+'/'+config.currentFileName, -1);
    let fullPath = config.folderOfFile + '/' + config.currentFileName + '/' + config.taskName;
    config.pathData.get(fullPath).content.done = true;
    config.pathData.get(config.folderOfFile+'/'+config.currentFileName).content = content;
    updateTasksNumInPathData(config.pathData, config.folderOfFile + '/' + config.currentFileName, -1);
    updateTasksInFile(config);
    updateData(config);
}

function validDate(dateText) {
    let bMonth = /-((01)|(03)|(05)|(07)|(08)|(10)|(12))-/;
    let sMonth = /-((04)|(06)|(09)|(11))-/;
    let bDay = /-((0[1-9])|([12][0-9])|(3[01]))$/;
    let sDay = /-((0[1-9])|([12][0-9])}|(30))$/;
    if(/\d{4}-\d{2}-\d{2}/.test(dateText)) {
        let yearNum = parseInt(dateText.slice(0, 4), 10);
        if((yearNum%100==0 && yearNum%400==0) || (yearNum%100!=0 && yearNum%4==0)) {  //闰年的情况
            if(/-02-/.test(dateText)) {
                if(/-((0[1-9])|(1[0-9])|(2[0-9])$)/.test(dateText)) {
                    return true;
                }
            } else {
                if(bMonth.test(dateText)) {  //31天
                    if(bDay.test(dateText)) {
                        return true;
                    }
                } else if(sMonth.test(dateText)) {
                    if(sDay.test(dateText)) {
                        return true;
                    }
                }
            }
        } else {
            if(/-02-/.test(dateText)) {
                if(/(-(0[1-9])|(1[0-9])|(2[0-8]))$/.test(dateText)) {
                    return true;
                }
            } else {
                if(bMonth.test(dateText)) {  //31天
                    if(bDay.test(dateText)) {
                        return true;
                    }
                } else if(sMonth.test(dateText)) {
                    if(sDay.test(dateText)) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}


