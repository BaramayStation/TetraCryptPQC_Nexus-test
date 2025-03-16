
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import WikiLayout from '@/components/layout/WikiLayout';
import { UserCheck } from 'lucide-react';

const DecentralizedIdentity: React.FC = () => {
  return (
    <WikiLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="border-b pb-4">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="h-6 w-6 text-primary" />
            <Badge variant="outline" className="text-xs">Identity</Badge>
          </div>
          <h1 className="text-3xl font-bold">Decentralized Identity</h1>
          <p className="mt-2 text-muted-foreground">
            Self-sovereign identity powered by post-quantum cryptography
          </p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-4">DID Overview</h2>
            <p>
              TetraCryptPQC implements decentralized identity (DID) technology to provide users
              with self-sovereign control over their digital identities, secured with quantum-resistant
              cryptography.
            </p>
          </CardContent>
        </Card>
      </div>
    </WikiLayout>
  );
};

export default DecentralizedIdentity;
