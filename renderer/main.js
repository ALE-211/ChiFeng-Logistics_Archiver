// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化UI事件
    initAuthView()
    
    // 检查是否已登录
    const user = await checkAuthStatus()
    if (user) {
      showMainView(user.isAdmin)
      if (user.isAdmin) {
        initAdminView()
      }
      initUserView()
    }
  })
  
  // 初始化认证视图
  function initAuthView() {
    // 切换登录/注册标签
    const tabs = document.querySelectorAll('.tab')
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'))
        tab.classList.add('active')
        
        document.getElementById('login-form').classList.toggle('hidden')
        document.getElementById('register-form').classList.toggle('hidden')
      })
    })
    
    // 登录表单提交
    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const username = document.getElementById('login-username').value
      const password = document.getElementById('login-password').value
      
      showLoading(true, '登录中...')
      const result = await window.electronAPI.login({ username, password })
      showLoading(false)
      
      if (result.success) {
        showMainView(result.isAdmin)
        if (result.isAdmin) {
          initAdminView()
        }
        initUserView()
      } else {
        alert(`登录失败: ${result.message}`)
      }
    })
    
    // 注册表单提交
    document.getElementById('register-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const username = document.getElementById('register-username').value
      const password = document.getElementById('register-password').value
      const inviteCode = document.getElementById('register-invite').value
      
      showLoading(true, '注册中...')
      const result = await window.electronAPI.register({ username, password, inviteCode })
      showLoading(false)
      
      if (result.success) {
        alert('注册成功，请登录')
        document.querySelector('.tab[data-tab="login"]').click()
      } else {
        alert(`注册失败: ${result.message}`)
      }
    })
  }
  
  // 检查认证状态
  async function checkAuthStatus() {
    try {
      // 这里应该从本地存储或通过API验证token有效性
      // 简化示例，实际应用中需要更完善的验证
      const token = localStorage.getItem('token')
      if (token) {
        // 验证token有效性
        return { username: localStorage.getItem('username'), isAdmin: localStorage.getItem('isAdmin') === 'true' }
      }
      return null
    } catch (error) {
      console.error('检查认证状态失败:', error)
      return null
    }
  }
  
  // 显示主视图
  function showMainView(isAdmin) {
    document.getElementById('auth-view').classList.add('hidden')
    document.getElementById('main-view').classList.remove('hidden')
    document.getElementById('username-display').textContent = localStorage.getItem('username')
    
    if (isAdmin) {
      document.getElementById('admin-view').classList.remove('hidden')
    }
    
    // 退出按钮事件
    document.getElementById('logout-btn').addEventListener('click', () => {
      localStorage.clear()
      location.reload()
    })
  }
  
  // 初始化用户视图
  function initUserView() {
    // 设置默认安装路径
    setDefaultInstallPath()
    
    // 浏览按钮事件
    document.getElementById('browse-btn').addEventListener('click', async () => {
      const defaultPath = document.getElementById('install-path').value
      const documentsPath = await window.electronAPI.getDocumentsPath()
      const result = await window.electronAPI.showOpenDialog({
        defaultPath: defaultPath || documentsPath,
        properties: ['openDirectory']
      })
      
      if (!result.canceled && result.filePaths.length > 0) {
        document.getElementById('install-path').value = result.filePaths[0]
      }
    })
    
    // 下载按钮事件
    document.getElementById('download-btn').addEventListener('click', async () => {
      const selectedArchive = document.querySelector('.archive-item.selected')
      if (!selectedArchive) {
        alert('请先选择一个存档')
        return
      }
      
      const archiveId = selectedArchive.dataset.id
      const installPath = document.getElementById('install-path').value
      
      if (!installPath) {
        alert('请选择安装路径')
        return
      }
      
      const profilePath = path.join(installPath, 'Euro Truck Simulator 2', 'profiles')
      
      try {
        showLoading(true, '下载存档中...')
        
        // 下载存档
        const downloadResult = await window.electronAPI.downloadArchive(archiveId)
        if (!downloadResult.success) {
          throw new Error(downloadResult.message)
        }
        
        // 解压存档
        showLoading(true, '安装存档中...')
        const extractResult = await window.electronAPI.extractArchive({
          zipPath: downloadResult.filePath,
          destination: profilePath
        })
        
        if (!extractResult.success) {
          throw new Error(extractResult.error)
        }
        
        alert('存档安装成功！')
      } catch (error) {
        console.error('存档安装失败:', error)
        alert(`存档安装失败: ${error.message}`)
      } finally {
        showLoading(false)
      }
    })
    
    // 加载存档列表
    loadUserArchives()
  }
  
  // 设置默认安装路径
  async function setDefaultInstallPath() {
    const documentsPath = await window.electronAPI.getDocumentsPath()
    const defaultPath = path.join(documentsPath, 'Euro Truck Simulator 2', 'profiles')
    document.getElementById('install-path').value = defaultPath
  }
  
  // 加载用户可用的存档列表
  async function loadUserArchives() {
    try {
      showLoading(true, '加载存档列表...')
      const result = await window.electronAPI.getArchives()
      
      if (result.success) {
        renderArchiveList(result.archives, 'user-archive-list')
      } else {
        alert(`获取存档列表失败: ${result.message}`)
      }
    } catch (error) {
      console.error('加载存档列表失败:', error)
      alert('加载存档列表失败')
    } finally {
      showLoading(false)
    }
  }
  
  // 渲染存档列表
  function renderArchiveList(archives, containerId) {
    const container = document.getElementById(containerId)
    container.innerHTML = ''
    
    if (archives.length === 0) {
      container.innerHTML = '<div class="empty-message">暂无存档</div>'
      return
    }
    
    archives.forEach(archive => {
      const archiveItem = document.createElement('div')
      archiveItem.className = 'archive-item'
      archiveItem.dataset.id = archive.id
      
      archiveItem.innerHTML = `
        <div class="archive-name">${archive.name}</div>
        <div class="archive-meta">
          <span class="archive-date">${new Date(archive.uploadDate).toLocaleString()}</span>
          <span class="archive-size">${formatFileSize(archive.size)}</span>
        </div>
        <div class="archive-description">${archive.description || '无描述'}</div>
      `
      
      // 选择存档事件
      archiveItem.addEventListener('click', () => {
        document.querySelectorAll('.archive-item').forEach(item => {
          item.classList.remove('selected')
        })
        archiveItem.classList.add('selected')
        document.getElementById('download-btn').disabled = false
      })
      
      container.appendChild(archiveItem)
    })
  }
  
  // 格式化文件大小
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  // 显示/隐藏加载指示器
  function showLoading(show, message = '') {
    const overlay = document.getElementById('loading-overlay')
    if (show) {
      overlay.querySelector('.loading-message').textContent = message
      overlay.classList.remove('hidden')
    } else {
      overlay.classList.add('hidden')
    }
  }