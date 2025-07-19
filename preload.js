const { contextBridge, ipcRenderer } = require('electron')
const ElectronStore = require('electron-store')

// 初始化electron-store
const store = new ElectronStore()

// 安全地暴露有限的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 存储操作
  getStoreValue: (key) => store.get(key),
  setStoreValue: (key, value) => store.set(key, value),
  
  // 文件系统操作
  getDocumentsPath: () => ipcRenderer.invoke('get-documents-path'),
  extractArchive: (data) => ipcRenderer.invoke('extract-archive', data),

  
  // 用户认证
  login: (credentials) => ipcRenderer.invoke('user-login', credentials),
  register: (data) => ipcRenderer.invoke('user-register', data),
  
  // 存档管理
  getArchives: () => ipcRenderer.invoke('get-archives'),
  uploadArchive: (filePath) => ipcRenderer.invoke('upload-archive', filePath),
  downloadArchive: (archiveId) => ipcRenderer.invoke('download-archive', archiveId),
  
  // 用户管理 (管理员)
  getUsers: () => ipcRenderer.invoke('get-users'),
  manageUser: (data) => ipcRenderer.invoke('manage-user', data),
  
  // 工具函数
  showMessage: (message) => ipcRenderer.send('show-message', message)
})