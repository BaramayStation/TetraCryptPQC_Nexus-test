import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GlassContainer } from "@/components/ui/glass-container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Key, Lock, Eye, EyeOff, Download, Copy, Shield, Clock, AlertTriangle, RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getUserProfile, rotateKeyPair } from "@/lib/storage";

const KeyInventoryPanel = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [keys, setKeys] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<any>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = () => {
    const profile = getUserProfile();
    const keysList = [];

    if (profile?.keyPairs?.pqkem) {
      keysList.push({
        ...profile.keyPairs.pqkem,
        type: "kem",
        displayName: "ML-KEM",
        icon: <Key className="h-4 w-4" />
      });
    }

    if (profile?.keyPairs?.signature) {
      keysList.push({
        ...profile.keyPairs.signature,
        type: "signature",
        displayName: "SLH-DSA",
        icon: <Lock className="h-4 w-4" />
      });
    }

    setKeys(keysList);
  };

  const filteredKeys = activeTab === "all" ? keys : keys.filter(key => key.type === activeTab);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${label} has been copied to clipboard`,
    });
  };

  const downloadKey = (key: any) => {
    const keyData = JSON.stringify({
      algorithm: key.algorithm,
      publicKey: key.publicKey,
      privateKey: key.privateKey,
      created: key.created,
      standard: key.standard,
      strength: key.strength
    }, null, 2);

    const blob = new Blob([keyData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${key.algorithm.toLowerCase().replace(/[- ]/g, "_")}_key.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Key Downloaded",
      description: `Your ${key.algorithm} key has been downloaded`,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getKeyAge = (created: string) => {
    const createdDate = new Date(created);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getKeyStatus = (key: any) => {
    const age = getKeyAge(key.created);

    if (age <= 90) {
      return { status: "Active", color: "bg-green-500" };
    } else if (age <= 180) {
      return { status: "Aging", color: "bg-yellow-500" };
    } else {
      return { status: "Rotation Needed", color: "bg-red-500" };
    }
  };

  const handleKeyRotation = async (key: any) => {
    await rotateKeyPair(key.algorithm);
    loadKeys();
    toast({
      title: "Key Rotated",
      description: `${key.algorithm} key has been securely rotated.`,
    });
  };

  return (
    <GlassContainer className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-accent" />
          <h2 className="text-xl font-semibold">Key Inventory</h2>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
          <TabsList>
            <TabsTrigger value="all">All Keys</TabsTrigger>
            <TabsTrigger value="kem">ML-KEM</TabsTrigger>
            <TabsTrigger value="signature">SLH-DSA</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {keys.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="h-16 w-16 mx-auto text-muted-foreground" />
          <h3 className="text-xl font-medium mt-4">No Keys Found</h3>
          <p className="text-muted-foreground mt-2">
            Generate keys in the "Generate" tab to get started.
          </p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Algorithm</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKeys.map((key, index) => {
                const keyStatus = getKeyStatus(key);
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium flex items-center gap-2">
                      {key.icon}
                      {key.displayName}
                    </TableCell>
                    <TableCell>{key.algorithm}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {formatDate(key.created)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={keyStatus.color}>{keyStatus.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleKeyRotation(key)}>
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Rotate
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => downloadKey(key)}>
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </GlassContainer>
  );
};

export default KeyInventoryPanel;
