# Automated Organization Provisioning Example

## API Implementation

```typescript
// /api/admin/organizations/provision
export async function POST(req: NextRequest) {
  const { 
    organizationName,
    domain,
    adminEmail,
    propertyDetails 
  } = await req.json();

  // 1. Create Organization
  const org = await prisma.organization.create({
    data: {
      name: organizationName,
      domain: domain, // "grandpalace-downtown"
    }
  });

  // 2. Create Admin User
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      name: "Property Admin",
    }
  });

  // 3. Link User to Organization
  await prisma.userOrg.create({
    data: {
      userId: adminUser.id,
      organizationId: org.id,
      role: "ORG_ADMIN"
    }
  });

  // 4. Send Magic Link Invitation
  await sendMagicLinkInvitation(adminEmail, org.domain);

  return NextResponse.json({ 
    organizationId: org.id,
    subdomain: `${domain}.pms-app.com`,
    adminInviteSent: true 
  });
}
```

## Super Admin Dashboard

```typescript
export function OrganizationProvisioningForm() {
  const [formData, setFormData] = useState({
    organizationName: "",
    domain: "",
    adminEmail: "",
    propertyDetails: {
      address: "",
      phone: "",
      timezone: "UTC"
    }
  });

  const handleProvision = async () => {
    const response = await fetch("/api/admin/organizations/provision", {
      method: "POST",
      body: JSON.stringify(formData)
    });
    
    if (response.ok) {
      toast.success("Organization created! Admin invitation sent.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Property Organization</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <input
            placeholder="Grand Palace Downtown"
            value={formData.organizationName}
            onChange={(e) => setFormData({
              ...formData, 
              organizationName: e.target.value
            })}
          />
          <input
            placeholder="grandpalace-downtown"
            value={formData.domain}
            onChange={(e) => setFormData({
              ...formData, 
              domain: e.target.value
            })}
          />
          <input
            placeholder="admin@grandpalace-downtown.com"
            value={formData.adminEmail}
            onChange={(e) => setFormData({
              ...formData, 
              adminEmail: e.target.value
            })}
          />
          <Button onClick={handleProvision}>
            Create Organization
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

## DNS & Infrastructure Setup

```bash
# Wildcard DNS (one-time setup)
*.pms-app.com → Your server IP

# Wildcard SSL Certificate
certbot certonly --dns-cloudflare \
  --dns-cloudflare-credentials ~/.secrets/cloudflare.ini \
  -d "*.pms-app.com"
```

## Benefits:
✅ Complete data isolation per property
✅ Custom branding per property
✅ Independent billing per property
✅ Scalable to unlimited properties
✅ Property-specific admin access
