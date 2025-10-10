# Auto-Assignment System Testing Guide

## Overview
This guide covers testing the load balancing + round-robin fallback auto-assignment system for QuickBase AI's enterprise ticketing feature.

## Test Scenarios

### 1. Basic Load Balancing
**Scenario**: Multiple team members with different workloads
**Setup**: 
- Organization with 3+ active team members
- Some members have open tickets, others don't
**Expected**: Ticket assigned to member with least open tickets
**Test Steps**:
1. Create test tickets manually assigned to some members
2. Use "Run Test Assignment" button in Assignment Settings
3. Verify new ticket goes to member with least workload

### 2. Round-Robin Fallback
**Scenario**: Multiple team members with equal workloads
**Setup**:
- Organization with 3+ active team members
- All members have same number of open tickets
**Expected**: Ticket assigned to member who was assigned longest ago
**Test Steps**:
1. Ensure all members have equal open ticket counts
2. Run test assignment multiple times
3. Verify assignments rotate between members

### 3. Single Team Member
**Scenario**: Organization with only one active team member
**Setup**:
- Organization with exactly 1 active team member
**Expected**: All tickets assigned to that member
**Test Steps**:
1. Remove all but one team member
2. Run test assignment
3. Verify ticket assigned to remaining member

### 4. No Active Team Members
**Scenario**: Organization with no active team members
**Setup**:
- Organization with all team members inactive
**Expected**: Assignment fails gracefully
**Test Steps**:
1. Deactivate all team members
2. Run test assignment
3. Verify error message about no active members

### 5. Auto-Assignment Disabled
**Scenario**: Auto-assignment is disabled for organization
**Setup**:
- Organization with auto-assignment disabled in settings
**Expected**: Assignment fails with appropriate message
**Test Steps**:
1. Disable auto-assignment in Assignment Settings
2. Run test assignment
3. Verify error message about disabled assignment

### 6. Mixed Workloads
**Scenario**: Complex workload distribution
**Setup**:
- Member A: 0 tickets
- Member B: 2 tickets  
- Member C: 2 tickets
- Member D: 1 ticket
**Expected**: Ticket assigned to Member A (least workload)
**Test Steps**:
1. Manually create tickets to achieve above distribution
2. Run test assignment
3. Verify assignment to Member A

### 7. Tied Workloads with Round-Robin
**Scenario**: Multiple members tied for least workload
**Setup**:
- Member A: 1 ticket, last assigned 2 days ago
- Member B: 1 ticket, last assigned 1 day ago
- Member C: 1 ticket, never assigned
**Expected**: Ticket assigned to Member A (longest since last assignment)
**Test Steps**:
1. Set up the above scenario
2. Run test assignment
3. Verify assignment to Member A

## Testing Tools

### 1. Assignment Settings UI
- **Location**: `/dashboard/organization` → Assignment tab
- **Features**:
  - Enable/disable auto-assignment
  - Configure assignment methods
  - View team workload
  - Run test assignments
  - View assignment statistics

### 2. Test Assignment Button
- **Purpose**: Creates a test ticket and assigns it automatically
- **Usage**: Click "Run Test Assignment" in Assignment Settings
- **Result**: Creates ticket with title "Test Assignment Ticket"

### 3. Assignment Analytics
- **Location**: `/dashboard/organization` → Analytics tab
- **Features**:
  - Total assignments count
  - Load balancing vs round-robin breakdown
  - Average response time
  - Team member statistics

### 4. Database Functions
- **`get_next_assignee(org_id)`**: Returns next assignee with method
- **`update_assignment_tracking()`**: Updates assignment statistics
- **`initialize_assignment_tracking()`**: Sets up tracking for new orgs

## Monitoring and Logging

### Console Logs
The assignment engine provides detailed logging:
```
=== AUTO ASSIGNMENT START ===
Organization ID: [uuid]
Ticket ID: [uuid]
Timestamp: [iso-string]

=== ASSIGNMENT DECISION ===
Selected Assignee ID: [uuid]
Assignment Method: load_balancing
Open Tickets Count: 2
Last Assigned At: [timestamp]
Total Candidates: 3

=== AUTO ASSIGNMENT SUCCESS ===
Final Result: {
  assigneeId: [uuid],
  method: 'load_balancing',
  openTickets: 2,
  trackingUpdated: true
}
```

### Database Tracking
- **`assignment_tracking`** table stores:
  - Total assignments count
  - Load balancing assignments count
  - Round-robin assignments count
  - Last assignment timestamp
  - Assignment method used

### Notifications
- Automatic notifications sent when tickets are assigned
- Triggered by database trigger on ticket updates
- Includes ticket details and assignee information

## Edge Cases Handled

1. **No Active Members**: Graceful failure with error message
2. **Single Member**: Direct assignment without complex logic
3. **Auto-Assignment Disabled**: Respects organization settings
4. **Database Errors**: Continues assignment even if tracking fails
5. **Invalid Organization**: Proper error handling and logging
6. **Concurrent Assignments**: Database-level consistency

## Performance Considerations

- **Database Queries**: Optimized with proper indexes
- **Assignment Logic**: Handled at database level for consistency
- **Caching**: Assignment tracking cached in database
- **Scalability**: Works with teams of any size

## Troubleshooting

### Common Issues

1. **"No active team members"**
   - Check team member status in organization
   - Ensure members are marked as 'active'

2. **"Auto-assignment is disabled"**
   - Check Assignment Settings
   - Enable auto-assignment if needed

3. **"Failed to update ticket assignment"**
   - Check database permissions
   - Verify ticket exists and is accessible

4. **Notifications not sent**
   - Check notification trigger in database
   - Verify user has notification permissions

### Debug Steps

1. Check console logs for detailed assignment flow
2. Verify database functions are installed correctly
3. Test with simple scenarios first
4. Use Assignment Analytics to monitor performance
5. Check team member workload distribution

## Success Criteria

✅ **Load Balancing Works**: Tickets assigned to least loaded members
✅ **Round-Robin Fallback**: Fair distribution when workloads are tied
✅ **Edge Cases Handled**: Graceful handling of all edge cases
✅ **Notifications Sent**: Users notified of new assignments
✅ **Statistics Tracked**: Assignment methods and counts recorded
✅ **UI Functional**: Settings and analytics work correctly
✅ **Performance Good**: Fast assignment decisions
✅ **Error Handling**: Proper error messages and logging

## Next Steps

After successful testing:
1. Monitor production usage
2. Gather user feedback
3. Optimize based on real-world usage patterns
4. Consider additional assignment methods (skill-based, availability-based)
5. Implement advanced analytics and reporting
