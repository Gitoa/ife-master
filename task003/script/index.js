//在creatClassList中需要将路径和文件名分开，在添加文件时，在目录的content中只添加文件名，但是在数据库中添加的应该是完整的路劲

var defaultFolderPath = '/';
var defaultFilePath = '默认分类';
var defaultFolderNode = document.getElementById('taskByClassMain');
var defaultFileParentNode; //该节点是动态创建的，需要在创建时赋值
var topFolders, currentFolderPath = defaultFolderPath, currentFilePath = defaultFilePath;
var currentLayer = 0, currentFolderNode = defaultFolderNode, currentFileParentNode = defaultFileParentNode;
var currentTasksFile;  //当前添加任务时的对应的文件，必须选定，为空时弹出提示
var classList = document.getElementById('taskByClassMain');
var taskList = document.getElementById('tasksListContent');
var indexedDB = window.indexedDB || window.msIndexedDB || window.webkitIndexedDb || window.mozIndexedDB;
var request, database, pathStore, fileStore;
var initDBFlag = false; //表示是否刚对数据库进行初始化，用于判断是否需要添加默认目录
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
    var getRequest = database.transaction('path').objectStore('path').get(targetPath);        getRequest.onerror = function(event) {
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
    } 
}

function showTask(task) {
    var singleTask = document.createElement('div');
    singleTask.setAttribute('class', 'singleTask ' + task.done);
    singleTask.innerHTML = task.name;
    var tasksByDate = taskList.querySelector('div[date="' + task.date +'"]');
    if(tasksByDate) {
        tasksByDate.appendChild(singleTask);
    } else {
        tasksByDate = document.createElement('div');
        tasksByDate.setAttribute('class', 'tasksByDate');
        tasksByDate.setAttribute('date',task.date);
        tasksByDate.innerHTML = `<div class='date'>${task.date.substring(0,4)}-${task.date.substring(4,6)}-${task.date.substring(6,8)}`;
        tasksByDate.appendChild(singleTask);
        taskList.appendChild(tasksByDate);
    }
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
    var target = event.target;
    var parent, imgChild;
    var currentFolderInfo;
    if(target.classList.contains('delete_button')){
        if(target.parentNode.getAttribute('class').toLowerCase() == 'task') {
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
    } else if(target.classList.contains('task')) {
        currentFolderInfo = target.parentNode.parentNode.querySelector('.folderInfo');
        [currentFolderPath, currentFolderNode, currentLayer] = getFolderPath(currentFolderInfo);
        showTasks(target);
    } else if(target.classList.contains('folderContent')) {
        currentFolderInfo = target.parentNode.querySelector('.folderInfo');
    } else if(target.classList.contains('folder')) {
        currentFolderInfo = target.querySelector('.folderInfo');
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
    console.log('currentFolderPath: ', currentFolderPath);
    console.log('currentFolderNode: ', currentFolderNode);
    console.log('currentFilePath: ', currentFilePath);
    console.log('currentFileParentNode: ', defaultFileParentNode);
}

function showTaskContent(event) {
    document.getElementById('taskName').innerHTML = event.target.innerHTML;
    document.getElementById('taskDate').innerHTML = (' ' + event.target.parentNode.getAttribute('date'));
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
    document.getElementById('tasksListContent').addEventListener('click', function(event) {
        if(event.target.classList.contains('singleTask')) {
            showTaskContent(event);
        }
    }, false);
    document.querySelector('#addClass').addEventListener('click', function(event) {
        var folderName = prompt('input folderName');
        if(folderName) {
            addFolder(currentFolderPath, folderName);
        }
    })
    document.querySelector('#addFile').addEventListener('click', function(event) {
        var fileName = prompt('input fileName');
        if(fileName) {
            addFile(currentFilePath, fileName);
        }
    })
    document.querySelector('#tasksOp button').addEventListener('click', function() {
        console.log('add task');
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