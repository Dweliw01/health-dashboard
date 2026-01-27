# 📱 iOS Shortcut: Build Instructions

Since I can't share .shortcut files directly, here's how to build it yourself in ~5 minutes.

## 🛠️ Build the Shortcut

### Step 1: Create New Shortcut

1. Open **Shortcuts** app on iPhone
2. Tap **+** (top right)
3. Name it: **"Sync Apple Health to Dashboard"**

### Step 2: Add Actions (in order)

#### Action 1: Get Current Date
- Search: "Date"
- Add: **Get Current Date**

#### Action 2: Format Date
- Search: "Format Date"
- Add: **Format Date**
- Format: **Custom**
- Format String: `yyyy-MM-dd`

#### Action 3: Set Variable (Date)
- Search: "Set Variable"
- Add: **Set Variable**
- Name it: `FormattedDate`

#### Action 4: Export Health Data (Steps)
- Search: "Find Health Samples"
- Add: **Find Health Samples**
- Sample Type: **Step Count**
- Time Range: **Last 7 Days**
- Sort by: **Start Date**
- Order: **Latest First**

#### Action 5: Count Steps
- Search: "Count"
- Add: **Count**
- Input: Health Samples (from previous action)

#### Action 6: Calculate Average
- Search: "Calculate"
- Add: **Calculate**
- Operation: **÷ (Divide)**
- Input 1: Count (from previous)
- Input 2: 7

#### Action 7: Set Variable (Steps)
- Search: "Set Variable"
- Add: **Set Variable**
- Name it: `AvgSteps`

#### Action 8: Get Workouts
- Search: "Find Workouts"
- Add: **Find Workouts**
- Time Range: **Last 7 Days**

#### Action 9: Count Workouts
- Search: "Count"
- Add: **Count**
- Input: Workouts

#### Action 10: Set Variable (Workouts)
- Search: "Set Variable"
- Add: **Set Variable**
- Name it: `WorkoutCount`

#### Action 11: Create JSON
- Search: "Dictionary"
- Add: **Dictionary**
- Add these keys:
  ```
  date: FormattedDate (variable)
  metrics:
    steps: AvgSteps (variable)
    workouts: WorkoutCount (variable)
  ```

#### Action 12: Convert to JSON
- Search: "Get Dictionary"
- Add: **Get Dictionary Value**
- (Automatically converts to JSON)

#### Action 13: Set Variable (JSON)
- Search: "Set Variable"
- Add: **Set Variable**
- Name it: `HealthJSON`

#### Action 14: Encode to Base64
- Search: "Base64 Encode"
- Add: **Base64 Encode**
- Input: HealthJSON

#### Action 15: Set Variable (Base64)
- Search: "Set Variable"
- Add: **Set Variable**
- Name it: `Base64Content`

#### Action 16: Build GitHub API URL
- Search: "URL"
- Add: **URL**
- URL: `https://api.github.com/repos/Dweliw01/health-dashboard/contents/fitness-data/apple_health_{FormattedDate}.json`
  (Replace {FormattedDate} with the FormattedDate variable)

#### Action 17: Create Request Body
- Search: "Dictionary"
- Add: **Dictionary**
- Keys:
  ```
  message: "📱 Apple Health sync {FormattedDate}"
  content: Base64Content (variable)
  branch: "main"
  ```

#### Action 18: Upload to GitHub
- Search: "Get Contents of URL"
- Add: **Get Contents of URL**
- URL: URL (from step 16)
- Method: **PUT**
- Headers:
  - `Authorization`: `Bearer YOUR_GITHUB_TOKEN_HERE`
  - `Accept`: `application/vnd.github+json`
- Request Body: Dictionary (from step 17)
- Request Type: **JSON**

#### Action 19: Show Result
- Search: "Show Notification"
- Add: **Show Notification**
- Title: "✅ Health Data Synced"
- Body: "Uploaded to GitHub successfully!"

### Step 3: Configure GitHub Token

In **Action 18** (Headers), replace `YOUR_GITHUB_TOKEN_HERE` with your actual GitHub token.

⚠️ **IMPORTANT:** Keep this token private! Don't share the shortcut with others.

---

## 🤖 Set Up Automation

1. Go to **Automation** tab in Shortcuts
2. Tap **+** (top right)
3. Create **Personal Automation**
4. Trigger: **Time of Day**
5. Time: **11:00 PM**
6. Repeat: **Daily**
7. Action: **Run Shortcut** → "Sync Apple Health to Dashboard"
8. **Turn off** "Ask Before Running"
9. **Turn off** "Notify When Run"

---

## ✅ Test It

1. Run the shortcut manually first
2. Check: https://github.com/Dweliw01/health-dashboard/tree/main/fitness-data
3. You should see: `apple_health_2026-01-27.json`
4. Dashboard will auto-update in ~1 minute

---

## 📋 Simple Version (Minimal)

If the above is too complex, here's a **super simple** version:

1. Export Health data manually once per week
2. Email yourself the export
3. Upload to GitHub web interface
4. Dashboard auto-updates

---

## 🔐 Security Note

The GitHub token gives access to your repository. To keep it secure:
- Only use it in this shortcut
- Don't share the shortcut with others
- Rotate the token every few months
- Use "repo" scope only (minimal permissions)

---

Need help building the shortcut? Let me know which step is confusing! 🚀
