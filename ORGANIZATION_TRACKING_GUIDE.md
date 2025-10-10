# Organization Tracking: How It Works

## 🏢 Complete Customer → Team Flow

### 1. **Website Setup (Enterprise)**
```
Enterprise User Creates Website
    ↓
Website automatically gets: organization_id = <enterprise_org_id>
    ↓
Widget embed code includes: data-website-id="<website-id>"
```

### 2. **Customer Experience**
```
Customer visits website with widget
    ↓
Uses "Talk to Human" button
    ↓
Ticket created with:
- website_id: <from widget>
- organization_id: <from website.organization_id>
- customer details
```

### 3. **Team Dashboard View**
```
Enterprise team logs in
    ↓
Dashboard shows only their tickets:
WHERE tickets.organization_id = <team's_org_id>
    ↓
Team can see which website each ticket came from
```

## 🔍 **How to Track Ticket Origins**

### **In Tickets Dashboard:**
- **Website Column**: Shows which website the ticket came from
- **Organization Filter**: Automatic (only your org's tickets)
- **Customer Info**: Email, name, original query preserved

### **Example Ticket Flow:**
```
acme.com website (org: Acme Corp)
    ↓
Customer: john@customer.com asks "How do I reset my password?"
    ↓
AI can't answer confidently → Escalation
    ↓
Ticket #ACM-001 appears in Acme Corp's dashboard
    ↓
Shows: "From: acme.com | Customer: john@customer.com"
```

## 📊 **Widget Analytics by Organization**

Each enterprise org sees:
- ✅ **Which websites** generated tickets
- ✅ **Customer details** for each inquiry
- ✅ **Original AI context** preserved
- ✅ **Only their organization's data**

## 🎯 **Multi-Website Organizations**

Enterprise orgs can have multiple websites:
```
Acme Corp (Enterprise)
├── acme.com (main site)
├── support.acme.com (help center)
└── shop.acme.com (e-commerce)
```

All tickets from any Acme website → Acme Corp team dashboard

## 🔒 **Data Isolation**

- **Individual users**: See only their personal websites/tickets
- **Enterprise teams**: See only their organization's data
- **Cross-org privacy**: Complete isolation via RLS policies