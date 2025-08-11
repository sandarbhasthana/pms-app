// File: scripts/verify-ui-components.ts
import * as fs from 'fs';
import * as path from 'path';

interface ComponentCheck {
  component: string;
  path: string;
  exists: boolean;
  hasExport: boolean;
  details?: string;
}

class UIComponentVerifier {
  private results: ComponentCheck[] = [];
  private srcPath = path.join(process.cwd(), 'src');

  private checkComponent(componentName: string, filePath: string): ComponentCheck {
    const fullPath = path.join(this.srcPath, filePath);
    const exists = fs.existsSync(fullPath);
    
    let hasExport = false;
    let details = '';

    if (exists) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        
        // Check for export
        const exportPatterns = [
          new RegExp(`export\\s+default\\s+${componentName}`),
          new RegExp(`export\\s+{[^}]*${componentName}[^}]*}`),
          new RegExp(`export\\s+const\\s+${componentName}`),
          new RegExp(`export\\s+function\\s+${componentName}`)
        ];
        
        hasExport = exportPatterns.some(pattern => pattern.test(content));
        
        // Get some details about the component
        const lines = content.split('\n').length;
        const hasTypeScript = content.includes('interface') || content.includes('type ');
        const hasProps = content.includes('Props') || content.includes('props');
        
        details = `${lines} lines, ${hasTypeScript ? 'TypeScript' : 'JavaScript'}, ${hasProps ? 'has props' : 'no props'}`;
        
      } catch (error) {
        details = `Error reading file: ${error}`;
      }
    }

    return {
      component: componentName,
      path: filePath,
      exists,
      hasExport,
      details
    };
  }

  async verifyPropertyComponents() {
    console.log('🔍 Verifying Property-Related UI Components...\n');

    // Core property components
    const components = [
      { name: 'PropertySwitcher', path: 'components/PropertySwitcher.tsx' },
      { name: 'PropertyForm', path: 'components/admin/PropertyForm.tsx' },
      { name: 'PropertyList', path: 'components/admin/PropertyList.tsx' },
      { name: 'PropertyManagement', path: 'components/admin/PropertyManagement.tsx' },
      { name: 'UserPropertyForm', path: 'components/admin/UserPropertyForm.tsx' },
      { name: 'UserPropertyList', path: 'components/admin/UserPropertyList.tsx' },
      { name: 'UserPropertyManagement', path: 'components/admin/UserPropertyManagement.tsx' },
      { name: 'PropertyDashboard', path: 'components/dashboard/PropertyDashboard.tsx' },
      { name: 'Badge', path: 'components/ui/badge.tsx' }
    ];

    for (const comp of components) {
      const result = this.checkComponent(comp.name, comp.path);
      this.results.push(result);
      
      const status = result.exists && result.hasExport ? '✅' : '❌';
      console.log(`${status} ${comp.name}`);
      console.log(`   Path: ${comp.path}`);
      console.log(`   Exists: ${result.exists ? 'Yes' : 'No'}`);
      console.log(`   Exported: ${result.hasExport ? 'Yes' : 'No'}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
      console.log('');
    }
  }

  async verifyPageComponents() {
    console.log('🔍 Verifying Property-Related Pages...\n');

    const pages = [
      { name: 'Dashboard', path: 'app/dashboard/page.tsx' },
      { name: 'Properties Admin', path: 'app/admin/settings/properties/page.tsx' },
      { name: 'User Properties Admin', path: 'app/admin/settings/user-properties/page.tsx' }
    ];

    for (const page of pages) {
      const fullPath = path.join(this.srcPath, page.path);
      const exists = fs.existsSync(fullPath);
      
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${page.name}`);
      console.log(`   Path: ${page.path}`);
      console.log(`   Exists: ${exists ? 'Yes' : 'No'}`);
      
      if (exists) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n').length;
          const hasPropertyContext = content.includes('property') || content.includes('Property');
          console.log(`   Details: ${lines} lines, ${hasPropertyContext ? 'property-aware' : 'no property context'}`);
        } catch (error) {
          console.log(`   Error: ${error}`);
        }
      }
      console.log('');
    }
  }

  async verifyAPIEndpoints() {
    console.log('🔍 Verifying Property-Related API Endpoints...\n');

    const apiEndpoints = [
      'app/api/properties/route.ts',
      'app/api/properties/[id]/route.ts',
      'app/api/properties/[id]/set-default/route.ts',
      'app/api/user-properties/route.ts',
      'app/api/user-properties/[id]/route.ts',
      'app/api/user-properties/bulk/route.ts',
      'app/api/auth/switch-property/route.ts',
      'app/api/dashboard/stats/route.ts'
    ];

    for (const endpoint of apiEndpoints) {
      const fullPath = path.join(this.srcPath, endpoint);
      const exists = fs.existsSync(fullPath);
      
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${endpoint}`);
      
      if (exists) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const hasPropertyValidation = content.includes('validatePropertyAccess') || content.includes('hasPropertyAccess');
          const hasPropertyContext = content.includes('withPropertyContext');
          const methods = [];
          
          if (content.includes('export async function GET')) methods.push('GET');
          if (content.includes('export async function POST')) methods.push('POST');
          if (content.includes('export async function PUT')) methods.push('PUT');
          if (content.includes('export async function PATCH')) methods.push('PATCH');
          if (content.includes('export async function DELETE')) methods.push('DELETE');
          
          console.log(`   Methods: ${methods.join(', ')}`);
          console.log(`   Property Validation: ${hasPropertyValidation ? 'Yes' : 'No'}`);
          console.log(`   Property Context: ${hasPropertyContext ? 'Yes' : 'No'}`);
        } catch (error) {
          console.log(`   Error: ${error}`);
        }
      }
      console.log('');
    }
  }

  async verifyLibraryFiles() {
    console.log('🔍 Verifying Property-Related Library Files...\n');

    const libFiles = [
      'lib/property-context.ts',
      'lib/session-utils.ts',
      'types/next-auth.d.ts'
    ];

    for (const libFile of libFiles) {
      const fullPath = path.join(this.srcPath, libFile);
      const exists = fs.existsSync(fullPath);
      
      const status = exists ? '✅' : '❌';
      console.log(`${status} ${libFile}`);
      
      if (exists) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n').length;
          const exportCount = (content.match(/export/g) || []).length;
          console.log(`   Details: ${lines} lines, ${exportCount} exports`);
        } catch (error) {
          console.log(`   Error: ${error}`);
        }
      }
      console.log('');
    }
  }

  printSummary() {
    console.log('📊 Component Verification Summary:');
    console.log('==================================');
    
    const totalComponents = this.results.length;
    const existingComponents = this.results.filter(r => r.exists).length;
    const exportedComponents = this.results.filter(r => r.exists && r.hasExport).length;
    
    console.log(`📁 Total Components Checked: ${totalComponents}`);
    console.log(`✅ Components Found: ${existingComponents}`);
    console.log(`📤 Components Properly Exported: ${exportedComponents}`);
    
    const missingComponents = this.results.filter(r => !r.exists);
    if (missingComponents.length > 0) {
      console.log('\n❌ Missing Components:');
      missingComponents.forEach(comp => {
        console.log(`   - ${comp.component} (${comp.path})`);
      });
    }
    
    const notExported = this.results.filter(r => r.exists && !r.hasExport);
    if (notExported.length > 0) {
      console.log('\n⚠️  Components Not Properly Exported:');
      notExported.forEach(comp => {
        console.log(`   - ${comp.component} (${comp.path})`);
      });
    }
    
    console.log(`\n🎯 Overall Status: ${missingComponents.length === 0 && notExported.length === 0 ? '✅ ALL GOOD' : '⚠️  ISSUES FOUND'}`);
  }

  async runAllVerifications() {
    console.log('🚀 Starting UI Component Verification...\n');
    
    await this.verifyPropertyComponents();
    await this.verifyPageComponents();
    await this.verifyAPIEndpoints();
    await this.verifyLibraryFiles();
    
    this.printSummary();
  }
}

async function main() {
  const verifier = new UIComponentVerifier();
  
  try {
    await verifier.runAllVerifications();
  } catch (error) {
    console.error('❌ Component verification failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { UIComponentVerifier };
