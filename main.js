const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs-extra')
const axios = require('axios')
const extract = require('extract-zip')
const ElectronStore = require('electron-store') // 修改了导入方式

// 初始化electron-store
ElectronStore.initRenderer() // 需要在主进程初始化

// 创建配置存储
const store = new ElectronStore() // 使用正确的构造函数

// 服务器配置
const SERVER_URL = 'https://ale211.eu.org' // 车队存档服务器地址

// 创建主窗口
let mainWindow

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true
    },
    title: '驰风车队接档器',
    icon: path.join(__dirname, 'assets/icon.png')
  })

  // 加载应用界面
  await mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'))

  // 开发模式下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }
}

// 应用准备就绪后创建窗口
app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 获取系统文档目录
ipcMain.handle('get-documents-path', async () => {
  return app.getPath('documents')
})

// 解压存档到指定目录
ipcMain.handle('extract-archive', async (event, { zipPath, destination }) => {
  try {
    await extract(zipPath, { dir: destination })
    return { success: true }
  } catch (error) {
    console.error('解压失败:', error)
    return { success: false, error: error.message }
  }
})

// 用户登录
ipcMain.handle('user-login', async (event, { username, password }) => {
  try {
    const response = await axios.post(`${SERVER_URL}/api/login`, {
      username,
      password
    })
    
    if (response.data.success) {
      // 保存用户信息和token
      store.set('user', {
        username,
        token: response.data.token,
        isAdmin: response.data.isAdmin
      })
      return { success: true, isAdmin: response.data.isAdmin }
    } else {
      return { success: false, message: response.data.message }
    }
  } catch (error) {
    console.error('登录失败:', error)
    return { success: false, message: '连接服务器失败' }
  }
})

// 用户注册
ipcMain.handle('user-register', async (event, { username, password, inviteCode }) => {
  try {
    const response = await axios.post(`${SERVER_URL}/api/register`, {
      username,
      password,
      inviteCode
    })
    
    return response.data
  } catch (error) {
    console.error('注册失败:', error)
    return { success: false, message: '连接服务器失败' }
  }
})

// 获取存档列表 (仅限管理员)
ipcMain.handle('get-archives', async (event) => {
  try {
    const user = store.get('user')
    if (!user || !user.isAdmin) {
      return { success: false, message: '无权访问' }
    }
    
    const response = await axios.get(`${SERVER_URL}/api/archives`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
    
    return response.data
  } catch (error) {
    console.error('获取存档列表失败:', error)
    return { success: false, message: '连接服务器失败' }
  }
})

// 上传存档 (仅限管理员)
ipcMain.handle('upload-archive', async (event, filePath) => {
  try {
    const user = store.get('user')
    if (!user || !user.isAdmin) {
      return { success: false, message: '无权访问' }
    }
    
    const formData = new FormData()
    formData.append('archive', fs.createReadStream(filePath), {
      filename: path.basename(filePath)
    })
    
    const response = await axios.post(`${SERVER_URL}/api/upload`, formData, {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'multipart/form-data'
      }
    })
    
    return response.data
  } catch (error) {
    console.error('上传存档失败:', error)
    return { success: false, message: '连接服务器失败' }
  }
})

// 下载存档
ipcMain.handle('download-archive', async (event, archiveId) => {
  try {
    const user = store.get('user')
    if (!user) {
      return { success: false, message: '请先登录' }
    }
    
    const response = await axios.get(`${SERVER_URL}/api/download/${archiveId}`, {
      headers: { Authorization: `Bearer ${user.token}` },
      responseType: 'stream'
    })
    
    // 创建临时目录保存下载的存档
    const tempDir = app.getPath('temp')
    const tempFilePath = path.join(tempDir, `ets2_archive_${Date.now()}.zip`)
    const writer = fs.createWriteStream(tempFilePath)
    
    response.data.pipe(writer)
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve({ 
        success: true, 
        filePath: tempFilePath 
      }))
      writer.on('error', reject)
    })
  } catch (error) {
    console.error('下载存档失败:', error)
    return { success: false, message: '连接服务器失败' }
  }
})

// 获取用户列表 (仅限管理员)
ipcMain.handle('get-users', async (event) => {
  try {
    const user = store.get('user')
    if (!user || !user.isAdmin) {
      return { success: false, message: '无权访问' }
    }
    
    const response = await axios.get(`${SERVER_URL}/api/users`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
    
    return response.data
  } catch (error) {
    console.error('获取用户列表失败:', error)
    return { success: false, message: '连接服务器失败' }
  }
})

// 管理用户 (仅限管理员)
ipcMain.handle('manage-user', async (event, { userId, action }) => {
  try {
    const user = store.get('user')
    if (!user || !user.isAdmin) {
      return { success: false, message: '无权访问' }
    }
    
    const response = await axios.post(`${SERVER_URL}/api/manage-user`, {
      userId,
      action
    }, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
    
    return response.data
  } catch (error) {
    console.error('用户管理失败:', error)
    return { success: false, message: '连接服务器失败' }
  }
})