//在creatClassList中需要将路径和文件名分开，在添加文件时，在目录的content中只添加文件名，但是在数据库中添加的应该是完整的路劲

var defaultFolderPath = '/';
var defaultFilePath = '默认分类';
var defaultFolderNode = document.getElementById('taskByClassMain');
var defaultFileParentNode; //该节点是动态创建的，需要在创建时赋值
var topFolders, currentFolderPath = defaultFolderPath, currentFilePath = defaultFilePath;
var currentLayer = 0, currentFolderNode = defaultFolderNode, currentFileParentNode = defaultFileParentNode;
var currentTasksFile;  //当前正在操作的task文件
var preFolderOrFile, currentFolderOrFile;  //表示当前正在访问的文件，添加class，突出显示
var classList = document.getElementById('taskByClassMain');
var taskList = document.getElementById('tasksListContent');
var indexedDB = window.indexedDB || window.msIndexedDB || window.webkitIndexedDb || window.mozIndexedDB;
var request, database, pathStore, fileStore;
var initDBFlag = false; //表示是否刚对数据库进行初始化，用于判断是否需要添加默认目录
var editingFlag = false;  //表示是否正在进行编辑操作
var addNewTask = false;
function initDB(resolve) {
    request = indexedDB.open('plana');
    request.onerror = function(event) {
        console.log('open failed: ' + event.target.errorCode);
    };
    request.onsuccess = function(event) {
        database = event.target.result;
        if(initDBFlag) {
            initDBFlag = false;
            var request = database.transaction(['path'], 'readwrite').objectStore('path').add({path: '/', content:[{name: '默认分类', type: 1}]})
            request.onerror = function(event) {
                console.log('初始化初始目录失败')
            }
            request.onsuccess = function(event) {
                console.log('初始化初始目录成功')
            }
            var defaultRequest = database.transaction(['path'], 'readwrite').objectStore('path').add({path: '默认分类', content: []});
            defaultRequest.onerror = function(event) {
                console.log('初始化默认目录失败');
            }
            defaultRequest.onsuccess = function(event) {
                console.log('初始化默认目录成功');
            }
        }
        console.log('open successed');
        console.log('DB version: ', database.version);
        resolve();
    }
    request.onupgradeneeded = function(event) {
        console.log('onupgradeneeded');
        database = event.target.result;
        if(!database.objectStoreNames.contains('path')) {
            initDBFlag = true;
            pathStore = database.createObjectStore('path', { keyPath: 'path'});
            pathStore.createIndex('path', 'path', {unique: true});
            pathStore.createIndex('content', 'content', {unique: false});
        }
        if(!database.objectStoreNames.contains('file')) {
            fileStore = database.createObjectStore('file', {keyPath: 'fileName'});
            fileStore.createIndex('fileName', 'fileName', {unique: true});
            fileStore.createIndex('taskInfo', 'taskInfo', {unique: false});
        }
    }
}
function createClassList(parentPath, fileName, layer=0) {
    var fullPath;
    if(layer == 0) {
        fullPath = fileName;
    } else {
        fullPath = parentPath + '/' + fileName;
    }
    //className是目录名称，根据目录名称创建目录
    var ele = document.createElement('div');
    var contentCount = 0;
    if(fullPath == '默认分类') {
        ele.setAttribute('class', 'folder closed default');
    } else {
        ele.setAttribute('class', 'folder closed');
    }  
    var marginLeft, paddingLeft;
    if(layer == 0) {
        marginLeft = '15px';
        paddingLeft = '15px';
    } else {
        marginLeft = (layer*10+5) + 'px';
        paddingLeft = (layer*10+15) + 'px';
    }
    ele.setAttribute('style','margin-left:-' + marginLeft + '; padding-left:' + paddingLeft + ';');
    var getRequest = database.transaction('path').objectStore('path').get(fullPath);
    getRequest.onerror = function(event) {
        console.log('get failed: ' + event.target.errorCode)
    }
    getRequest.onsuccess = function(event) {
        var result = event.target.result;
        if(result) {
            contentCount = result.content.length;
        } 
        if(fullPath == '默认分类') {
            ele.innerHTML = `<div class='folderInfo' style='margin-left:-${paddingLeft}; padding-left:${paddingLeft};'><span class="folderImg closed"></span><span class="folderName">${fileName} (${contentCount})</span></div>
                    <div class="folderContent"></div>`;
            defaultFileParentNode = document.querySelector('#taskByClassMain .default .folderContent');
            currentFileParentNode = defaultFileParentNode;
        } else {
            ele.innerHTML = `<div class='folderInfo' style='margin-left:-${paddingLeft}; padding-left:${paddingLeft};'><span class="folderImg closed"></span><span class="folderName">${fileName} (${contentCount})</span><img src='img/-ionicons-svg-md-trash.svg' class='delete_button'></div>
                    <div class="folderContent"></div>`;
        }
        if(contentCount == 0) {
            return ele;
        }
        var contentList = ele.getElementsByClassName('folderContent')[0];
        for(let item of result.content) {
            let childEle = document.createElement('div');
            if(item.type == 1) {
                childEle = createClassList(fullPath, item.name, layer+1);      
            } else {
                childEle.setAttribute('class', 'task');
                if(layer == 0) {
                    childEle.setAttribute('style','margin-left:-15px; ' + 'padding-left:30px;');
                } else {
                    childEle.setAttribute('style','margin-left:-' + (layer*10+15)+ 'px; ' + 'padding-left:' + (layer*10+30) +'px;');
                }
                childEle.innerHTML = item.name + "<img src='img/-ionicons-svg-md-trash.svg' class='delete_button'></img>";
            }
            contentList.appendChild(childEle);
        }
    }
    return ele;
}
function get(pathName) {
    var getRequest = database.transaction('path').objectStore('path').get(pathName);
    getRequest.onerror = function(event) {
        console.log('get failed: ' + event.target.errorCode)
    }
    getRequest.onsuccess = function(event) {
        console.log(event.target);
        console.log(event.target.result);
    }
}
function removePath(path) {
    var request = database.transaction('path', 'readwrite').objectStore('path').delete(path);
    request.onsuccess = function(event) {
        console.log('delete successed')
    }
}
function deleteFile(path) {
    console.log('delete file: ', path);
    //首先将文件中的内容删除，递归
    //for files in path : deleteFile;
    var request = database.transaction('path').objectStore('path').get(path);
    request.onerror = function(event) {
        console.log('get in delete failed');
    }
    request.onsuccess = function(event) {
        var result = event.target.result;
        var fileList = result.content;
        for(let file of fileList) {
            deleteFile(path + '/' + file.name);
        }
        var delRequest = database.transaction('path', 'readwrite').objectStore('path').delete(path);
        delRequest.onsuccess = function(event) {
            console.log('delete ' + path +' successed');
        }
    }
    //将文件从父目录中删除
}
function addTopFolder(folderName) {
    var addRequest = database.transaction('path', 'readwrite').objectStore('path').add({path: folderName, content: []});
    addRequest.onerror = function(event) {
        console.log('add failed: ' + event.target.errorCode)
    }
    addRequest.onsuccess = function(event) {
        console.log('add success');
    }
}
function addFolder(targetPath, folderName) {
    //className是目录名称，根据目录名称创建目录
    var ele = document.createElement('div');
    ele.setAttribute('class', 'folder closed'); 
    var marginLeft, paddingLeft;
    if(currentLayer == 0) {
        marginLeft = '15px';
        paddingLeft = '15px';
    } else {
        marginLeft = (currentLayer*10+5) + 'px';
        paddingLeft = (currentLayer*10+15) + 'px';
    }
    ele.setAttribute('style','margin-left:-' + marginLeft + '; padding-left:' + paddingLeft + ';');
    ele.innerHTML = `<div class='folderInfo' style='margin-left:-${paddingLeft}; padding-left:${paddingLeft};'><span class="folderImg closed"></span><span class="folderName">${folderName} (0)</span><img src='img/-ionicons-svg-md-trash.svg' class='delete_button'></div>
                    <div class="folderContent"></div>`;
    currentFolderNode.appendChild(ele);
    var folderPath;
    if(!targetPath || targetPath == '/') {//topFolder,与默认分类目录同级
        folderPath = folderName
    } else {
        folderPath = targetPath + '/' + folderName;
    }

    console.log('targetPath: ' + targetPath);
    var getRequest = database.transaction('path').objectStore('path').get(targetPath);        
    getRequest.onerror = function(event) {
        console.log('get failed: ' + event.target.errorCode)
    }
    getRequest.onsuccess = function(event) {
        var updatedContent = event.target.result.content;
        for(let item of updatedContent) {
            if(item.name == folderName) {
                console.log('folder already exists')
                return;
            }
        }
        updatedContent.push({name:folderName, type:1});
        updatedContent.sort(function(a, b) {
            return b.type - a.type;
        })
        var putRequest = database.transaction('path', 'readwrite').objectStore('path').put({path: targetPath, content:updatedContent});
        putRequest.onerror = function(event) {
            console.log('update failed: ' + event.target.errorCode);
        }
        putRequest.onsuccess = function(event) {
            console.log('update success');
        }
        var addRequest = database.transaction('path', 'readwrite').objectStore('path').add({path: folderPath, content: []});
        addRequest.onerror = function(event) {
            console.log('add failed: ' + event.target.errorCode)
        }
        addRequest.onsuccess = function(event) {
            console.log('add success');
        }
    }
}

function addFile(targetPath, fileName) {
    let childEle = document.createElement('div');
    childEle.setAttribute('class', 'task');
    if(currentLayer == 0) {
        childEle.setAttribute('style','margin-left:-15px; ' + 'padding-left:30px;');
    } else {
        childEle.setAttribute('style','margin-left:-' + (currentLayer*10+15)+ 'px; ' + 'padding-left:' + (currentLayer*10+30) +'px;');
    }
    childEle.innerHTML = fileName + "<img src='img/-ionicons-svg-md-trash.svg' class='delete_button'></img>";
    console.log(currentFolderNode);
    currentFileParentNode.appendChild(childEle);
    var filePath;
    if(!targetPath || targetPath == '/') {
        targetPath = '默认分类';
    }
    filePath = targetPath + '/' + fileName;
    console.log('targetPath: ' + targetPath);
    console.log('filePath: ', filePath);
    var pathStore = database.transaction('path', 'readwrite').objectStore('path');
    var getRequest = pathStore.get(targetPath);
    getRequest.onerror = function(event) {
        console.log('get failed: ' + event.target.errorCode);
    };
    getRequest.onsuccess = function(event) {
        console.log('get successed');
        var updatedContent = event.target.result.content;
        for(let item of updatedContent) {
            if(item.name == fileName) {
                console.log('file already exists');
                return;
            }
        }
        updatedContent.push({name:fileName, type:0});
        updatedContent.sort(function(a, b) {
            return b.type - a.type;
        })
        var putRequest = pathStore.put({path:targetPath, content:updatedContent});
        putRequest.onerror = function(event) {
            console.log('put failed');
        }
        putRequest.onsuccess = function(event) {
            console.log('put successed');
        }
        var addRequest = pathStore.add({path:filePath, content:[]});
        addRequest.onerror = function(event) {
            console.log('add failed')
        }
        addRequest.onsuccess = function(event) {
            console.log('add success');
        }
    }
}
function showTasks(taskEle) {
    //taskEle是class='task'的div元素
    var taskName = taskEle.firstChild.data;
    var fullFilePath = currentFolderPath + '/' + taskName;
    console.log(fullFilePath);
    taskList.innerHTML = '';
    var request = database.transaction('path').objectStore('path').get(fullFilePath);
    request.onerror = function(event) {
        console.log('get file failed');
    }
    request.onsuccess = function(event) {
        var result = event.target.result;
        console.log('taskList: ', result);
        for(let task of result.content) {
            showTask(task);
        }
    } 
}

function showTask(task) {
    var singleTask = document.createElement('div');
    singleTask.setAttribute('class', 'singleTask ');
    if(task.done) {
        singleTask.classList.add('done');
    } else {
        singleTask.classList.add('undo');
    }
    singleTask.innerHTML = task.name;
    var tasksByDate = taskList.querySelector('div[date="' + task.date +'"]');
    if(tasksByDate) {
        tasksByDate.appendChild(singleTask);
    } else {
        tasksByDate = document.createElement('div');
        tasksByDate.setAttribute('class', 'tasksByDate');
        tasksByDate.setAttribute('date',task.date);
        tasksByDate.innerHTML = `<div class='date'>${task.date}</div>`;
        tasksByDate.appendChild(singleTask);
        taskList.appendChild(tasksByDate);
    }
}

function clearTasks() {
    addNewTask = false;
    currentTasksFile = null;
    editingFlag = false;
    document.getElementById('tasksListContent').innerHTML = '';
}

function showAllTask(event) {
    var singleTasks = document.querySelectorAll('.singleTask');
    console.log(singleTasks);
    for (let singleTask of singleTasks) {
        singleTask.style.display = '';
    }
}

function showUndoTask(event) {
    var singleTasks = document.querySelectorAll('.singleTask');
    for (let singleTask of singleTasks) {
        if(!singleTask.classList.contains('undo')) {
            singleTask.style.display = 'none';
        } else {
            singleTask.style.display = '';
        }
    }
}

function showDoneTask(event) {
    var singleTasks = document.querySelectorAll('.singleTask');
    console.log(singleTasks);
    for (let singleTask of singleTasks) {
        if(singleTask.classList.contains('done')) {
            singleTask.style.display = '';
        } else {
            singleTask.style.display = 'none';
        }
    }
}
function getFolderPath(target) {
    var originTarget = target;
    var layer = 0;
    //target是folderInfo节点
    function getFolderName(infoEle) {
        return infoEle.getElementsByClassName('folderName')[0].innerHTML.split(' ')[0];
    }
    if(!target) {
        return ['/', document.getElementById('taskByClassMain'), layer];
    } else {
        layer ++;
        var path = target.getElementsByClassName('folderName')[0].innerHTML.split(' ')[0];
        var parentInfo, parentFolder;
        parentFolder = target.parentNode.parentNode.parentNode;
        while(parentFolder.id.toLowerCase() != 'taskbyclass') {
            parentInfo = target.parentNode.parentNode.parentNode.getElementsByClassName('folderInfo')[0];
            path = getFolderName(parentInfo) + '/' + path;
            target = parentInfo;
            parentFolder = target.parentNode.parentNode.parentNode;
            layer ++;
        }
        return [path, originTarget.parentNode.getElementsByClassName('folderContent')[0], layer];
    }
}

function getTaskPath(target) {
    var path = target.parentNode.firstChild.data;
    var parentPath = getFolderPath(target.parentNode.parentNode.parentNode.firstChild)[0];
    path = parentPath + '/' + path;
    return path;
}

function folderClick(event) {
    clearTaskContent();
    clearTasks();
    var target = event.target;
    var parent, imgChild;
    var currentFolderInfo;
    if(target.classList.contains('delete_button')){
        if(target.parentNode.classList.contains('task')) {
            console.log('delete task');
            var taskName = target.parentNode.firstChild.data;
            var path = getTaskPath(target);
            var parentFolderPath = path.substring(0, path.lastIndexOf('/'));
            console.log(parentFolderPath);
            console.log(path);
            var delRequest = database.transaction('path', 'readwrite').objectStore('path').delete(path);
            delRequest.onerror = function(event) {
                console.log('delete failed: ' + event.target.errorCode);
            }
            delRequest.onsuccess = function(event) {
                // 从父文件夹content中删掉该文件
                var getRequest = database.transaction('path').objectStore('path').get(parentFolderPath);
                getRequest.onerror = function(event) {
                    console.log('get failed: ' + event.target.errorCode);
                }
                getRequest.onsuccess = function(event) {
                    var result = event.target.result;
                    var updatedContent = result.content;
                    var indexOfItem = -1;
                    for(let i=0; i<updatedContent.length; i++) {
                        if(updatedContent[i].name == taskName) {
                            indexOfItem = i;
                        }
                    }
                    updatedContent.splice(indexOfItem, 1);
                    var putRequest = database.transaction('path', 'readwrite').objectStore('path').put({path: parentFolderPath, content: updatedContent});
                    putRequest.onsuccess = function(event) {
                        console.log('delete task successed');
                    }
                }
                target.parentNode.parentNode.removeChild(target.parentNode);
            }
            return;
        }
        console.log('delete folder');
        var folderInfo = target.parentNode;
        var fileName = folderInfo.getElementsByClassName('folderName')[0].innerHTML.split(' ')[0];
        console.log('filename: ' + fileName);
        var fullPath = getFolderPath(folderInfo)[0];
        var parentFolder;
        var parentFolderPath;
        var parentFolderNode;
        console.log('fullpath: ', fullPath);
        deleteFile(fullPath);
        if(folderInfo.parentNode.parentNode.id.toLowerCase() == 'taskbyclassmain') {
            parentFolder = '/';
            parentFolderPath = '/';
            parentFolderNode = folderInfo.parentNode.parentNode;
        } else {
            parentFolder = folderInfo.parentNode.parentNode.parentNode.getElementsByClassName('folderInfo')[0];
            parentFolderPath = getFolderPath(parentFolder)[0];
            parentFolderNode = folderInfo.parentNode.parentNode;
            console.log(parentFolder);
            console.log(parentFolderPath);
        }
        var request = database.transaction('path').objectStore('path').get(parentFolderPath);
        request.onerror = function(event) {
            console.log('1 failed');
        }
        request.onsuccess = function(event) {
            var result = event.target.result;
            var updatedContent = result.content;
            console.log(updatedContent);
            var index = -1;
            for(let i=0; i<updatedContent.length; i++) {
                if(updatedContent[i].name == fileName) {
                    index = i;
                    break;
                }
            }
            if(index != -1) {
                updatedContent.splice(index, 1);
            }
            var putRequest = database.transaction('path', 'readwrite').objectStore('path').put({path: parentFolderPath, content: updatedContent});
            putRequest.onsuccess = function(event) {
                console.log('update success');
            }
            parentFolderNode.removeChild(folderInfo.parentNode);
        }
        return;
    }
    if(target.classList.contains('task')) {
        currentFolderInfo = target.parentNode.parentNode.querySelector('.folderInfo');
        [currentFolderPath, currentFolderNode, currentLayer] = getFolderPath(currentFolderInfo);
        if(!currentFolderOrFile) {
            currentFolderOrFile = target;
            currentFolderOrFile.classList.add('currentFolderOrFile');
        } else {
            currentFolderOrFile.classList.remove('currentFolderOrFile');
            currentFolderOrFile = target;
            currentFolderOrFile.classList.add('currentFolderOrFile');
        }
        showTasks(target);
    } else {
        if(target.classList.contains('folderInfo')) {
            parent = target.parentNode;
            imgChild = target.querySelector('.folderImg');
            imgChild.classList.toggle('open');
            imgChild.classList.toggle('closed');
            parent.classList.toggle('open');
            parent.classList.toggle('closed');
            currentFolderInfo = target;
        } else if(target.classList.contains('folderImg') || target.classList.contains('folderName')) {
            parent = target.parentNode.parentNode;
            imgChild = parent.getElementsByClassName('folderImg')[0];
            imgChild.classList.toggle('open');
            imgChild.classList.toggle('closed');
            parent.classList.toggle('open');
            parent.classList.toggle('closed');
            currentFolderInfo = target.parentNode;
        } else if(target.classList.contains('folderContent')) {
            currentFolderInfo = target.parentNode.querySelector('.folderInfo');
        } else if(target.classList.contains('folder')) {
            currentFolderInfo = target.querySelector('.folderInfo');
        }
        if(!currentFolderOrFile) {
            currentFolderOrFile = currentFolderInfo;
            currentFolderOrFile.classList.add('currentFolderOrFile');
        } else {
            currentFolderOrFile.classList.remove('currentFolderOrFile');
            currentFolderOrFile = currentFolderInfo;
            currentFolderOrFile.classList.add('currentFolderOrFile');
        }
    }
    if(currentFolderInfo && currentFolderInfo.parentNode.id.toLowerCase() == 'taskbyclass') {
        currentFolderPath = defaultFolderPath;
        currentFolderNode = defaultFolderNode;
        currentLayer = 0;
    } else {
        [currentFolderPath, currentFolderNode, currentLayer] = getFolderPath(currentFolderInfo);
    }
    if(currentFolderPath == '默认分类') {
        document.getElementById('addClass').setAttribute('disabled', true);
    } else {
        document.getElementById('addClass').removeAttribute('disabled');
    }
    if(currentFolderPath == '/') {
        currentFilePath = '默认分类';
        currentFileParentNode = defaultFileParentNode;
    } else {
        currentFilePath = currentFolderPath;
        currentFileParentNode = currentFolderNode;
    }
    console.log('currentFolderInfo: ', currentFolderInfo);
    console.log('currentFolderPath: ', currentFolderPath);
    console.log('currentFolderNode: ', currentFolderNode);
    console.log('currentFilePath: ', currentFilePath);
    console.log('currentFileParentNode: ', defaultFileParentNode);
}

function showTaskContent(event) {
    currentTasksFile = event.target;
    if(event.target.classList.contains('undo')) {
        document.querySelector('#taskOp').setAttribute('style', 'display:inline-block');
    } else {
        document.querySelector('#taskOp').removeAttribute('style');
    }
    document.getElementById('taskName').innerHTML = event.target.innerHTML;
    document.getElementById('taskDate').value = (' ' + event.target.parentNode.getAttribute('date'));
    var fullTaskPath = currentFilePath + '/' + currentFolderOrFile.firstChild.data + '/' + event.target.innerHTML;
    console.log(fullTaskPath);
    var request = database.transaction('path').objectStore('path').get(fullTaskPath);
    request.onerror = function(event) {
        console.log(' failed');
    }
    request.onsuccess = function(event) {
        document.getElementById('taskTextContent').value = event.target.result.content.taskContent;
    }
}

function checkTask() {
    var filePath = currentFilePath + '/' + currentFolderOrFile.firstChild.data;
    var taskName = document.querySelector('#taskName').innerHTML;
    var fileContent;
    var getRequest = database.transaction('path').objectStore('path').get(filePath);
    var newTaskContent;
    getRequest.onerror = function() {
        console.log('get failed');
    }
    getRequest.onsuccess = function(event) {
        var result = event.target.result;
        fileContent = result.content;
        for(task of fileContent) {
            if(task.name == taskName) {
                task.done = true;
            }
        }
        var putRequest = database.transaction('path', 'readwrite').objectStore('path').put({path:filePath, content:fileContent});
        putRequest.onerror = function() {
            console.log('check failed');
        }
        putRequest.onsuccess = function() {
            console.log('check successed');
        }
    }
    var getTask = database.transaction('path').objectStore('path').get(filePath + '/' + taskName);
    getTask.onerror = function() {
        console.log('getTask failed');
    }
    getTask.onsuccess = function(event) {
        var result = event.target.result;
        newTaskContent = result.content;
        newTaskContent.done = true;
        var putRequest = database.transaction('path', 'readwrite').objectStore('path').put({path: filePath + '/' + taskName, content: newTaskContent});
        putRequest.onerror = function() {
            console.log('put task failed');
        }
        putRequest.onsuccess = function(event) {
            console.log('put task successed');
            document.getElementById('taskOp').setAttribute('style', 'display:none');
            document.getElementById('taskDate').readOnly = true;
            document.getElementById('taskTextContent').readOnly = true;
            document.getElementById('submit').setAttribute('disabled', true);
            document.getElementById('cancel').setAttribute('disabled', true);
            currentTasksFile.classList.remove('undo');
            currentTasksFile.classList.add('done');
        }
    }
}

function clearTaskContent() {
    document.querySelector('#taskOp').removeAttribute('style');
    document.getElementById('taskName').innerHTML = '';
    document.getElementById('taskDate').value = '';
    document.getElementById('taskTextContent').value = '';
    document.getElementById('submit').setAttribute('disabled', true);
    document.getElementById('cancel').setAttribute('disabled', true);
    document.getElementById('taskDate').readOnly = true;
    document.getElementById('taskTextContent').readOnly = true;
    addNewTaks = false;
    currentTasksFile = null;
    editingFlag = false;
}

function addTask(task) {  //创建新任务，进入任务编辑模式，编辑完毕后submit按钮提交任务
    var getRequest = database.transaction('path').objectStore('path').get(currentFilePath + '/' + currentFolderOrFile.firstChild.data + '/' + task);
    console.log(currentFilePath + '/' + currentFolderOrFile.firstChild.data + '/' + task);
    getRequest.onerror = function(event) {
        console.log('get failed: ' + event.target.errorCode)
    }
    getRequest.onsuccess = function(event) {
        if(!event.target.result) {  //说明路径不存在，可以添加，进入编辑模式
            document.querySelector('#taskName').innerHTML = task;
            document.querySelector('#taskInfo input').readOnly = false;
            document.querySelector('#taskMain textarea').readOnly = false;
            document.querySelector('#taskInfo input').focus();
            editingFlag = true;
            document.querySelector('#submit').removeAttribute('disabled');
            document.querySelector('#cancel').removeAttribute('disabled');
            addNewTask = true;
        } else {  //路径已存在，不可添加
            alert('存在同名任务，请重新操作');
        }
    }
}

function submitTask() {  //将当前任务进行提交
    //获得任务名称，创建路径，获得日期和内容，还有完成信息，保存在content中，加入数据库
    var taskName = document.querySelector('#taskName').innerHTML;
    var taskDate = document.querySelector('#taskDate').value;
    var taskContent = document.querySelector('#taskTextContent').value;
    var datePattern = /\d{4}-\d{2}-\d{2}/g;
    console.log(taskDate);
    var filePath = currentFilePath + '/' + currentFolderOrFile.firstChild.data;
    if(!datePattern.test(taskDate)) {
        alert('日期格式错误');
        return;
    }
    var newContent = {
        type: 2,
        taskDate: taskDate,
        taskContent: taskContent,
        done: false,
        taskName: taskName
    };
    var fullTaskPath = currentFilePath + '/' + currentFolderOrFile.firstChild.data + '/' + taskName;
    //  在文件的content中添加任务(仅当是添加时，若为修改状态则不添加)
    var getRequest = database.transaction('path').objectStore('path').get(currentFilePath + '/' + currentFolderOrFile.firstChild.data);
    getRequest.onerror =function(event) {
        console.log('get failed');
    }
    getRequest.onsuccess = function(event) {  //需要将路径加到文件的content中，创建对应路径的数据
        var result = event.target.result;
        var fileContent = result.content;
        console.log('addNewTask: ', addNewTask);
        if(addNewTask) {
            addNewTask = false;
            fileContent.push({name:taskName, done:false, date:taskDate});
            fileContent.sort(function(a, b) {
                if(a.date > b.date) {
                    return -1;
                } else {
                    return 1;
                }
            })
        }
        var putRequest = database.transaction('path', 'readwrite').objectStore('path').put({path:filePath, content:fileContent});
        putRequest.onerror = function(event) {
            console.log('update failed: ' + event.target.errorCode);
        }
        putRequest.onsuccess = function(event) {
            console.log('add task to file content successed');
        }
        var addRequest = database.transaction('path', 'readwrite').objectStore('path').put({path:fullTaskPath, content:newContent});
        addRequest.onerror = function() {
            console.log('add task failed');
        }
        addRequest.onsuccess = function() {
            console.log('add task successed');
            document.querySelector('#submit').setAttribute('disabled', true);
            document.querySelector('#cancel').setAttribute('disabled', true);
        }
    }
    document.getElementById('taskDate').readOnly = true;
    document.getElementById('taskTextContent').readOnly = true;
    editingFlag = false;
}
function init() {
    console.log('init', database);
    var getRequest = database.transaction('path').objectStore('path').get('/');
    getRequest.onerror = function(event) {
        console.log('get failed: ' + event.target.errorCode);
    }
    getRequest.onsuccess = function(event) {
        topFolders = event.target.result.content;
        console.log(topFolders);
        for(let topFolder of topFolders) {
            classList.appendChild(createClassList('', topFolder.name, 0));
        };
    }
    //创建数据库，用path作为主键，data为目录下内容
    
    document.getElementById('taskByClass').addEventListener('click', function(event){
            folderClick(event);
        }, false);
    document.getElementById('tasksNav').addEventListener('click', function(event) {
        console.log(event.target.id);
        var navList = document.querySelectorAll('#tasksNav>span');
        if(event.target.id.toLowerCase() == 'showall') {
            console.log(document);
            var navList = document.querySelectorAll('#tasksNav>span');
            for(let showButton of navList) {
                showButton.classList.remove('show');
            }
            event.target.classList.add('show');
            showAllTask(event);
        } else if(event.target.id.toLowerCase() == 'showundo') {
            for(let showButton of navList) {
                showButton.classList.remove('show');
            }
            event.target.classList.add('show');
            showUndoTask(event);
        } else if(event.target.id.toLowerCase() == 'showdone') {
            for(let showButton of navList) {
                showButton.classList.remove('show');
            }
            event.target.classList.add('show');
            showDoneTask(event);
        }
    });
    document.getElementById('tasksListContent').addEventListener('click', function(event) {  //对tasksListContent中的内容进行事件委托
        clearTaskContent();
        if(event.target.classList.contains('singleTask')) {
            showTaskContent(event);
        }
    }, false);
    document.querySelector('#addClass').addEventListener('click', function(event) {
        var folderName = prompt('input folderName');
        if(folderName) {
            addFolder(currentFolderPath, folderName);
        }
    });
    document.querySelector('#addFile').addEventListener('click', function(event) {
        var fileName = prompt('input fileName');
        if(fileName) {
            addFile(currentFilePath, fileName);
        }
    });
    document.querySelector('#tasksOp button').addEventListener('click', function() {
        console.log('add task');
        if(currentFolderOrFile && currentFolderOrFile.classList.contains('task')) {
            console.log(currentFolderOrFile.firstChild.data);
            var taskName = prompt('input task name');
            if(taskName) {
                addTask(taskName);
            }
        } else {
            alert('请选择文件');
        }
    });
    document.querySelector('#submit').addEventListener('click', function() {
        alert('修改完提交');
        submitTask();
    });
    document.querySelector('#cancel').addEventListener('click', function() {
        clearTaskContent();
        alert('取消操作');
    });
    document.getElementById('checkmark').addEventListener('click', function(event) {
        if(editingFlag) {
            alert('editing');
            return;
        }
        if(confirm('check?')) {
            //将当前任务标记为已完成
            checkTask();
        } else {
            //取消操作
        }
    });
    document.getElementById('editTask').addEventListener('click', function(event) {
        document.getElementById('taskDate').readOnly = false;
        document.getElementById('taskTextContent').readOnly = false;
        document.getElementById('submit').removeAttribute('disabled');
        document.getElementById('cancel').removeAttribute('disabled');
        editingFlag = true;
    })
}

window.onload = function() {
    let promise = new Promise(function(resolve, reject) {
        initDB(resolve);
    })
    promise.then(function() {
        init()
    });
}