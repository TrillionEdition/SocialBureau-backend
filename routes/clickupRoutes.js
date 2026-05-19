const express = require("express");
const clickupController = require("../controllers/clickupController");
const clickupRoutes = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Temporary storage before proxying to ClickUp


const userAuthentication = require("../middlewares/userAuthentication");

clickupRoutes.get('/tasks', userAuthentication, clickupController.getTasks);
clickupRoutes.get('/tasks/:taskId', userAuthentication, clickupController.getTaskById);
clickupRoutes.get('/time', userAuthentication, clickupController.getTime);
clickupRoutes.get('/user-task', userAuthentication, clickupController.getTasksById);
clickupRoutes.get('/user-details', userAuthentication, clickupController.getUserDetails);
clickupRoutes.get('/test', userAuthentication, clickupController.testClickUp);
clickupRoutes.get('/tasks/:taskId/activity', userAuthentication, clickupController.getTaskActivity);
clickupRoutes.post('/create-task', userAuthentication, clickupController.createTask);
clickupRoutes.get('/chat-messages/:viewId', userAuthentication, clickupController.getChatComments);
clickupRoutes.post('/chat-messages/:viewId', userAuthentication, clickupController.postChatComment);
clickupRoutes.post('/chat-messages/:viewId/attachment', userAuthentication, upload.single('attachment'), clickupController.uploadAttachment);
clickupRoutes.get('/image-proxy', clickupController.proxyClickUpImage);
clickupRoutes.get('/general-activity', userAuthentication, clickupController.getGeneralActivity);



// Test form for debugging
clickupRoutes.get('/test-form', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>ClickUp Task Test Form</title>
      <style>
        body { font-family: Arial; max-width: 600px; margin: 50px auto; }
        input, textarea { width: 100%; padding: 8px; margin: 5px 0 15px 0; box-sizing: border-box; }
        button { padding: 10px 20px; background: #3498db; color: white; border: none; cursor: pointer; }
        #response { margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h1>ClickUp Task Creation Test</h1>
      <form onsubmit="submitForm(event)">
        <label>Client Name:</label>
        <input type="text" id="clientName" value="Test Client" required>
        
        <label>Company Name:</label>
        <input type="text" id="clientCompany" value="Test Company">
        
        <label>Status:</label>
        <select id="status" style="width: 100%; padding: 8px; margin: 5px 0 15px 0;">
          <option value="intake">Intake</option>
          <option value="qualified">Qualified</option>
          <option value="proposal_sent">Proposal Sent</option>
          <option value="negotiating">Negotiating</option>
          <option value="closed_won">Closed Won</option>
          <option value="closed_lost">Closed Lost</option>
        </select>
        
        <label>Due Date (optional):</label>
        <input type="date" id="dueDate">
        
        <label>Priority:</label>
        <select id="priority" style="width: 100%; padding: 8px; margin: 5px 0 15px 0;">
          <option value="1">High (1)</option>
          <option value="2" selected>Medium (2)</option>
          <option value="3">Low (3)</option>
          <option value="4">No Priority (4)</option>
        </select>
        
        <button type="submit">Create ClickUp Task</button>
      </form>
      
      <div id="response"></div>
      
      <script>
        async function submitForm(event) {
          event.preventDefault();
          
          const dueDate = document.getElementById('dueDate').value;
          const taskData = {
            clientName: document.getElementById('clientName').value,
            clientCompany: document.getElementById('clientCompany').value,
            status: document.getElementById('status').value,
            priority: parseInt(document.getElementById('priority').value),
            dueDate: dueDate ? new Date(dueDate).toISOString() : null
          };
          
          console.log('Sending:', taskData);
          
          try {
            const response = await fetch('/clickup/create-task', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(taskData)
            });
            
            const data = await response.json();
            const responseDiv = document.getElementById('response');
            
            if (response.ok && data.success) {
              responseDiv.innerHTML = \`<h3 style="color: green;">✅ Success!</h3><pre>\${JSON.stringify(data, null, 2)}\</pre>\`;
            } else {
              responseDiv.innerHTML = \`<h3 style="color: red;">❌ Error</h3><pre>\${JSON.stringify(data, null, 2)}\</pre>\`;
            }
          } catch (error) {
            document.getElementById('response').innerHTML = \`<h3 style="color: red;">❌ Network Error</h3><pre>\${error.message}\</pre>\`;
          }
        }
      </script>
    </body>
    </html>
  `);
});

module.exports = clickupRoutes;