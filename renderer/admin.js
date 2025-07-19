// 初始化管理员视图
function initAdminView() {
    // 上传按钮事件
    document.getElementById('upload-btn').addEventListener('click', async () => {
      const fileInput = document.getElementById('archive-upload')
      if (fileInput.files.length === 0) {
        alert('请先选择存档文件')
        return
      }
      
      try {
        showLoading(true, '上传存档中...')
        const result = await window.electronAPI.uploadArchive(fileInput.files[0].path)
        
        if (result.success) {
          alert('存档上传成功')
          loadAdminArchives()
          fileInput.value = '' // 清空文件选择
        } else {
          alert(`上传失败: ${result.message}`)
        }
      } catch (error) {
        console.error('上传失败:', error)
        alert('上传失败')
      } finally {
        showLoading(false)
      }
    })
    
    // 加载存档和用户列表
    loadAdminArchives()
    loadUsers()
  }
  
  // 加载管理员存档列表
  async function loadAdminArchives() {
    try {
      showLoading(true, '加载存档列表...')
      const result = await window.electronAPI.getArchives()
      
      if (result.success) {
        renderAdminArchiveList(result.archives)
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
  
  // 渲染管理员存档列表
  function renderAdminArchiveList(archives) {
    const container = document.getElementById('admin-archive-list')
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
        <div class="archive-header">
          <div class="archive-name">${archive.name}</div>
          <div class="archive-actions">
            <button class="btn btn-danger btn-sm archive-delete" data-id="${archive.id}">删除</button>
          </div>
        </div>
        <div class="archive-meta">
          <span class="archive-date">上传时间: ${new Date(archive.uploadDate).toLocaleString()}</span>
          <span class="archive-size">大小: ${formatFileSize(archive.size)}</span>
          <span class="archive-uploader">上传者: ${archive.uploader}</span>
        </div>
        <div class="archive-description">
          <textarea class="form-control description-input" placeholder="添加描述...">${archive.description || ''}</textarea>
          <button class="btn btn-secondary btn-sm update-description" data-id="${archive.id}">更新描述</button>
        </div>
      `
      
      // 删除存档事件
      archiveItem.querySelector('.archive-delete').addEventListener('click', async (e) => {
        e.stopPropagation()
        if (confirm('确定要删除这个存档吗？')) {
          try {
            showLoading(true, '删除存档中...')
            const result = await window.electronAPI.deleteArchive(archive.id)
            
            if (result.success) {
              loadAdminArchives()
            } else {
              alert(`删除失败: ${result.message}`)
            }
          } catch (error) {
            console.error('删除失败:', error)
            alert('删除失败')
          } finally {
            showLoading(false)
          }
        }
      })
      
      // 更新描述事件
      archiveItem.querySelector('.update-description').addEventListener('click', async (e) => {
        e.stopPropagation()
        const description = archiveItem.querySelector('.description-input').value
        
        try {
          showLoading(true, '更新描述中...')
          const result = await window.electronAPI.updateArchiveDescription({
            id: archive.id,
            description
          })
          
          if (!result.success) {
            alert(`更新失败: ${result.message}`)
          }
        } catch (error) {
          console.error('更新失败:', error)
          alert('更新失败')
        } finally {
          showLoading(false)
        }
      })
      
      container.appendChild(archiveItem)
    })
  }
  
  // 加载用户列表
  async function loadUsers() {
    try {
      showLoading(true, '加载用户列表...')
      const result = await window.electronAPI.getUsers()
      
      if (result.success) {
        renderUserList(result.users)
      } else {
        alert(`获取用户列表失败: ${result.message}`)
      }
    } catch (error) {
      console.error('加载用户列表失败:', error)
      alert('加载用户列表失败')
    } finally {
      showLoading(false)
    }
  }
  
  // 渲染用户列表
  function renderUserList(users) {
    const container = document.getElementById('user-list')
    container.innerHTML = ''
    
    if (users.length === 0) {
      container.innerHTML = '<div class="empty-message">暂无用户</div>'
      return
    }
    
    users.forEach(user => {
      const userItem = document.createElement('div')
      userItem.className = 'user-item'
      userItem.dataset.id = user.id
      
      userItem.innerHTML = `
        <div class="user-info">
          <div class="user-name">${user.username}</div>
          <div class="user-status">
            <span class="badge ${user.isActive ? 'badge-success' : 'badge-danger'}">
              ${user.isActive ? '活跃' : '禁用'}
            </span>
            ${user.isAdmin ? '<span class="badge badge-primary">管理员</span>' : ''}
          </div>
        </div>
        <div class="user-actions">
          ${!user.isAdmin ? `
            <button class="btn btn-sm ${user.isActive ? 'btn-danger' : 'btn-success'} user-toggle">
              ${user.isActive ? '禁用' : '激活'}
            </button>
            <button class="btn btn-sm btn-primary user-promote" ${user.isAdmin ? 'disabled' : ''}>
              设为管理员
            </button>
          ` : ''}
        </div>
      `
      
      // 切换用户状态事件
      userItem.querySelector('.user-toggle').addEventListener('click', async (e) => {
        e.stopPropagation()
        const action = user.isActive ? 'deactivate' : 'activate'
        
        try {
          showLoading(true, '更新用户状态中...')
          const result = await window.electronAPI.manageUser({
            userId: user.id,
            action
          })
          
          if (result.success) {
            loadUsers()
          } else {
            alert(`操作失败: ${result.message}`)
          }
        } catch (error) {
          console.error('操作失败:', error)
          alert('操作失败')
        } finally {
          showLoading(false)
        }
      })
      
      // 提升为管理员事件
      userItem.querySelector('.user-promote').addEventListener('click', async (e) => {
        e.stopPropagation()
        if (confirm(`确定要将用户 ${user.username} 设为管理员吗？`)) {
          try {
            showLoading(true, '更新用户权限中...')
            const result = await window.electronAPI.manageUser({
              userId: user.id,
              action: 'promote'
            })
            
            if (result.success) {
              loadUsers()
            } else {
              alert(`操作失败: ${result.message}`)
            }
          } catch (error) {
            console.error('操作失败:', error)
            alert('操作失败')
          } finally {
            showLoading(false)
          }
        }
      })
      
      container.appendChild(userItem)
    })
  }