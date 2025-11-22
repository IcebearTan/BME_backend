<script setup>
import api from '../api';
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Select, CloseBold } from '@element-plus/icons-vue';

const formInline = reactive({
  key: ''
});
const dialogFormVisible = ref(false);
const permissionDialogVisible = ref(false);
const users = ref([]);
const allUsers = ref([]);
const filteredUsers = ref([]); // 新增：用于存储当前筛选后的用户列表
const currentPage = ref(1);//当前页面
const pageSize = ref(16);//每页显示的条数
const action = ref('edit');
const totalItems = ref(0);//总条数

// 权限管理相关
const allPermissions = ref([]);
const currentUser = ref(null);
const userPermissions = ref([]);
const selectedPermissions = ref([]);
const permissionLoading = ref(false);

// const handleSearch = async () => {//搜索框逻辑，后端搜索
//   try {
//     const response = await api({
//       url: '未写入',
//       method: 'get',
//       params: {
//         key: formInline.key
//       }
//     })
//     console.log(已搜索到的用户);
//     users.value = response.data;
//     if (!response.data || response.data.length === 0) {
//       ElMessage({
//         message: '未找到相关用户',
//         type: 'warning'
//       });
//     }
//   } catch (error) {
//     ElMessage({
//       message: '搜索失败',
//       type: 'error'
//     });
//   }
// };

const handleSearch = () => {//搜索框逻辑，前端搜索
  const keyword = formInline.key.trim();
  currentPage.value = 1;
  if (!keyword) {
    filteredUsers.value = allUsers.value;
  } else {
    filteredUsers.value = allUsers.value.filter(user => {
      const name = user.User_Name ? String(user.User_Name) : '';
      const mode = user.User_Mode ? String(user.User_Mode) : '';
      const id = user.User_Id ? String(user.User_Id) : '';
      return name.includes(keyword) || mode.includes(keyword) || id.includes(keyword);
    });
  }
  totalItems.value = filteredUsers.value.length;
  updatePagedUsers();
};

const tableLabel = ref([
  {
    prop: 'User_Id',
    label: '用户id',
    width: 80
  },
  {
    prop: 'User_Name',
    label: '用户名',
    width: 200
  },
  {
    prop: 'User_Mode',
    label: '用户权限',
    width: 150
  },
  {
    prop: 'join_time',
    label: '入营时间',
    width: 250
  },
  {
    prop: 'User_Email',
    label: '用户邮箱',
    width: 250
  }
])

const fetchUsers = async () => {
  try {
    const response = await api({
      url: '/user/user_list',
      method: 'get',
    })
    allUsers.value = response.data;
    filteredUsers.value = allUsers.value;
    totalItems.value = allUsers.value.length;
    updatePagedUsers();
  } catch (error) {
    ElMessage({
        message: 'Unpredicted error',
        type: 'warning'
      });
  }
}

const updatePagedUsers = () => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  users.value = filteredUsers.value.slice(start, end);
};

const handlePageChange = (page) => {
  currentPage.value = page;
  updatePagedUsers();
};

// 获取所有权限列表
const fetchAllPermissions = async () => {
  try {
    const response = await api({
      url: '/permissions/list',
      method: 'get'
    });
    if (response.data.code === 200) {
      allPermissions.value = response.data.permissions || [];
    }
  } catch (error) {
    ElMessage.error('获取权限列表失败');
    console.error('获取权限列表失败:', error);
  }
};

// 获取用户权限
const fetchUserPermissions = async (userId) => {
  permissionLoading.value = true;
  try {
    const response = await api({
      url: `/permissions/user/${userId}`,
      method: 'get'
    });
    if (response.data.code === 200) {
      userPermissions.value = response.data.permissions || [];
      selectedPermissions.value = userPermissions.value.map(p => p.id);
    }
  } catch (error) {
    ElMessage.error('获取用户权限失败');
    console.error('获取用户权限失败:', error);
  } finally {
    permissionLoading.value = false;
  }
};

// 打开权限管理对话框
const handleEditPermissions = async (user) => {
  currentUser.value = user;
  await fetchUserPermissions(user.User_Id);
  permissionDialogVisible.value = true;
};

// 智能切换全选/全不选
const handleToggleSelectAll = () => {
  // 如果有任何权限被选中，则清空；否则全选
  if (selectedPermissions.value.length > 0) {
    selectedPermissions.value = [];
  } else {
    selectedPermissions.value = allPermissions.value.map(p => p.id);
  }
};

// 保存权限更改
const handleSavePermissions = async () => {
  if (!currentUser.value) return;
  
  permissionLoading.value = true;
  try {
    // 找出需要添加和删除的权限
    const currentPermissionIds = userPermissions.value.map(p => p.id);
    const toAdd = selectedPermissions.value.filter(id => !currentPermissionIds.includes(id));
    const toRemove = currentPermissionIds.filter(id => !selectedPermissions.value.includes(id));
    
    // 分配新权限
    for (const permissionId of toAdd) {
      await api({
        url: '/permissions/assign',
        method: 'post',
        data: {
          user_id: currentUser.value.User_Id,
          permission_id: permissionId
        }
      });
    }
    
    // 撤销权限
    for (const permissionId of toRemove) {
      await api({
        url: '/permissions/revoke',
        method: 'post',
        data: {
          user_id: currentUser.value.User_Id,
          permission_id: permissionId
        }
      });
    }
    
    ElMessage.success('权限更新成功');
    permissionDialogVisible.value = false;
  } catch (error) {
    ElMessage.error('权限更新失败: ' + (error.response?.data?.message || error.message));
    console.error('权限更新失败:', error);
  } finally {
    permissionLoading.value = false;
  }
};

onMounted(() => {
  fetchUsers();
  fetchAllPermissions();
});
</script>

<template>
  <div style="width: 100%; height: 100%; position: relative; overflow: hidden;">
    <div class="header-container">
      <div class="l-container">用户列表</div>
      <div class="r-container">
        
        <el-form :inline="true" class="form-inline" :model="formInline" @submit.prevent>
          
          <el-form-item label="用户查询" style="margin: 0; align-items: center;">
            <el-input 
              placeholder=" 输入用户名&权限&id" 
              v-model="formInline.key" 
              @keyup.enter="handleSearch"
              clearable
            ></el-input>
          </el-form-item>
          
          <el-form-item style="margin: 0; align-items: center; margin-right: 20px; margin-left: 10px;">
            <el-button type="primary" @click="handleSearch">
              <el-icon>
                <Search />
              </el-icon>
            </el-button>
          </el-form-item>
        
        </el-form>
      
      </div>
    </div>

    <div style="margin: 20px;">
      <div class="table">
          <el-table 
            :data="users" 
            style="width: 100%; overflow-y: auto; height: calc(100% - 40px);"
            :row-style="{ height: '40px' }"
            
          >
          
          <el-table-column v-for="item in tableLabel" :key="item.prop" :prop="item.prop" :label="item.label" 
            :width="item.width ? item.width : 125" />   
           <!-- <el-table :data="users" style="width: 100%; max-height: 700px;"> -->
          <el-table-column fixed="right" label="Operations" min-width="180">
            
            <template #="scoped">
              <el-button type="primary" size="small" @click="handleEditPermissions(scoped.row)">编辑权限</el-button>
              <el-button type="danger" size="small" @click="handleDelete(scoped.row)">删除</el-button>
            </template>
          
          </el-table-column>
        </el-table>
        <div class="pagination-wrapper">
          <el-pagination
          @current-change="handlePageChange"
          :page-size="pageSize"
          :pager-count="11"
          layout="prev, pager, next"
          :total="totalItems"
          :current-page="currentPage"
          
        />
        </div>
      </div>

      <!-- <el-pagination @current-change="handlePageChange" :current-page="currentPage" :page-size="pageSize"
        :total="totalItems" layout="prev, pager, next" style="position:absolute; bottom: 0; margin-bottom: 20px;">
      </el-pagination>  -->
    </div>

    <el-dialog v-model="dialogFormVisible" :title="action == 'add' ? '新增课程' : '编辑用户'" width="500">
      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item label="用户名" :label-width="formLabelWidth" prop="username">
          <el-input v-model="form.username" autocomplete="off" />
        </el-form-item>
        <el-form-item label="用户密码" :label-width="formLabelWidth" prop="password">
          <el-input v-model="form.password" autocomplete="off" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCancle">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确认</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 权限管理对话框 -->
    <el-dialog 
      v-model="permissionDialogVisible" 
      title="用户权限管理" 
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-loading="permissionLoading">
        <el-alert
          title="权限说明"
          type="info"
          :closable="false"
          style="margin-bottom: 20px;"
        >
          <template #default>
            <p style="margin: 0;">正在编辑用户: <strong>{{ currentUser?.User_Name }}</strong></p>
            <p style="margin: 5px 0 0 0;">请选择要分配给该用户的权限</p>
          </template>
        </el-alert>

        <!-- 智能全选按钮 -->
        <div style="margin-bottom: 15px; display: flex; gap: 10px; align-items: center;">
          <el-button 
            size="small" 
            @click="handleToggleSelectAll"
            :type="selectedPermissions.length > 0 ? 'warning' : 'primary'"
          >
            <el-icon><component :is="selectedPermissions.length > 0 ? CloseBold : Select" /></el-icon>
            {{ selectedPermissions.length > 0 ? '清空选择' : '全选' }}
          </el-button>
          <el-tag type="info" size="small">
            已选择 {{ selectedPermissions.length }} / {{ allPermissions.length }} 项权限
          </el-tag>
        </div>

        <el-checkbox-group v-model="selectedPermissions">
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <el-card 
              v-for="permission in allPermissions" 
              :key="permission.id"
              shadow="hover"
              style="cursor: pointer;"
              :class="{ 'permission-selected': selectedPermissions.includes(permission.id) }"
            >
              <el-checkbox 
                :label="permission.id" 
                style="width: 100%;"
              >
                <div style="display: flex; flex-direction: column;">
                  <span style="font-weight: 600; font-size: 16px;">{{ permission.name }}</span>
                  <span style="color: #909399; font-size: 14px; margin-top: 5px;">{{ permission.description }}</span>
                </div>
              </el-checkbox>
            </el-card>
          </div>
        </el-checkbox-group>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="permissionDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleSavePermissions"
            :loading="permissionLoading"
          >
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
    
  </div>


   
</template>

<style scoped>
.pagination-wrapper {
    position: static;
    width: 100%;
    background-color: white;
    height: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    
}

.table {
  width: 100%;
  height: calc(100vh - 220px);
  max-height: 600px;
  border-radius: 10px;
  border-width: 1px;
  border-style: solid;
  border-color: #C4C4C4;
  box-shadow: 0px 5px 10px 1px#f7f7f7;
  overflow: hidden;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;

  margin: 10px;
  height: 40px;

  .l-container {
    display: inline-block;

    font-size: 30px;
    font-weight: 900;

    margin-left: 20px;

    color: #3b5cd5;
  }

  .r-container {
    display: flex;
    align-items: center;

    .form-inline {
      display: flex;
      justify-content: center;

      .el-form-item {
        text-align: center;
      }

      margin: 0;
    }
    
    /* font-size: 30px;
    font-weight: 900;

    margin-left: 20px;

    color: #08e397; */
  }

}

.default-card {
  display: inline-block;
  width: 350px;

  margin: 20px;

  cursor: pointer;
}

.default-card:hover {
  transform: translateY(-10px);
  box-shadow: #c4c4c4 0px 0px 10px;
}

.loading {
  margin-left: 30px;
  font-size: 20px;
  font-weight: 900;

  color: #4f4f4f;
}

.details {
  color: #767676;
}

.create-button {
  display: inline-block;
  margin-bottom: 5px;

  margin-left: 10px;
}

.permission-selected {
  border-color: #409eff;
  background-color: #ecf5ff;
}

</style>

<!-- <script>
import api from '../api';
import { md5 } from 'js-md5';
import { ElMessage, ElMessageBox } from 'element-plus';

export default {
  data() {
    return {
      formInline: {
        key: ''
      },
      dialogFormVisible: false,
      users: [
        {
          id: 1,
          username: 'admin',
          is_admin: '是',
        },
        {
          id: 2,
          username: 'user1',
          is_admin: '否',
        },
        {
          id: 3,
          username: 'user2',
          is_admin: 1,
        },
      ],
      tableLabel: [
        {
          prop: 'User_Id',
          label: '用户id',
          width: '200px',
        },
        {
          prop: 'username',
          label: '用户名',
          width: '300px',
        },
        {
          prop: 'User_Mode',
          label: '用户权限',
          width: '300px',
        },
      ],
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
      username: null,
      user_id: '',
      form: {
        username: '',
        password: '',
      },
      rules: {
        username: [
          { required: true, message: '请输入用户名', trigger: 'blur' },
        ],
        password: [
          { required: true, message: '请输入用户密码', trigger: 'blur' },
        ],
      },
      action: 'edit',
    };
  },

  async created() {
    await this.fetchData();
  },

  methods: {
    async fetchData() {
      try {
        const response = await api.get(`/api/admin/users/`, {
          params: {
            page: this.currentPage,
            size: this.pageSize,
            username: this.username,
          }
        }
        );
        if (!response.data.users.length) {
          ElMessage({
            message: 'No user found',
            type: 'warning'
          });
          return;
        }
        this.users = response.data.users;
        this.totalItems = response.data.total;
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    },
    async fetchCourse(page = 1) {
      try {
        const response = await api.get('/admin/course/', {
          params: {
            page: 1,
            size: this.pageSize,
            course_name: this.formInline.key
          }
        });
        if (!response.data.courses.length) {
          ElMessage({
            message: 'No course found',
            type: 'warning'
          });
          return;
        }
        this.courses = response.data.courses;
        this.totalItems = response.data.total;
      } catch (error) {
        console.error('Failed to fetch course:', error);
      }
    },
    async deleteUser(user) {
      try {
        await api.delete(`/api/admin/user/${user.id}`);
        ElMessage({
          message: '删除成功',
          type: 'success'
        });
        this.fetchData();
      } catch (error) {
        console.error('Failed to delete course:', error);
      }
    },
    async addUser() {
      try {
        const response = await api.post('/courses/', this.form);

        this.courses.push(response.data);

        ElMessage({
          message: '添加成功',
          type: 'success'
        });
        this.dialogFormVisible = false;
        this.fetchData();
      } catch (error) {
        console.error('Failed to add course:', error);
      }
    },
    async editUser() {
      try {
        this.form.password = md5(this.form.password);
        const response = await api.put(`/api/admin/user/${this.form.id}`, this.form);
        this.users.push(response.data);

        ElMessage({
          message: '修改成功',
          type: 'success'
        });
        this.dialogFormVisible = false;
        this.fetchData();
      } catch (error) {
        console.error('Failed to add course:', error);
      }
    },
    showAssignments(user) {
      this.dialogTableVisible = true;
      console.log(course.assignments);
      this.assignments = course.assignments;
    },
    formatDateTime(row, col, dateTime, index) {
      const date = new Date(dateTime);
      const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      return date.toLocaleString('en-US', options).replace(',', '');
    },
    handlePageChange(page) {
      this.currentPage = page;
      this.fetchData(page);
    },
    handleSearch() {
      if (this.formInline.key) {
        this.username = this.formInline.key;
      }
      this.fetchData();
    },
    handleDelete(val) {
      ElMessageBox.confirm('你确定要删除吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.deleteUser(val);
      });
    },
    handleAdd() {
      this.action = 'add';

      this.form.username = '';
      this.form.password = '';

      this.dialogFormVisible = true;
    },
    handleEdit(user) {
      this.action = 'edit';
      this.form.id = user.id;

      this.form.username = user.username;
      this.form.instructor = '';

      this.dialogFormVisible = true;
    },
    handleSubmit() {
      this.$refs.formRef.validate((valid) => {
        if (valid) {
          if (this.action === 'edit') {
            this.editUser();
          } else {
            this.addUser();
          }
          this.form.username = '';
          this.form.password = '';
        } else {
          // Form is invalid
          console.log('Form validation failed');
          return false;
        }
      });
    },
    handleCancle() {
      this.dialogFormVisible = false;
      this.form.username = '';
      this.form.password = '';
    },
  },
  computed: {

  }
};
</script> -->
