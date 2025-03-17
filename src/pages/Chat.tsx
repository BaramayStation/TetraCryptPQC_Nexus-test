import React, { useState, useEffect, useCallback } from 'react';
import { MainLayout } from "@/layout/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Shield, UserPlus, Users } from "lucide-react";
import Conversation from "@/components/chat/Conversation";
import { getContacts, saveContact, getUserProfile } from "@/lib/storage";
import { Contact } from "@/lib/storage-types";
import { useToast } from "@/components/ui/use-toast";

// Main Chat Component
const Chat: React.FC = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');

  // Load contacts when component mounts
  useEffect(() => {
    let loadedContacts = getContacts();

    if (!loadedContacts || loadedContacts.length === 0) {
      const demoContacts: Contact[] = [
        {
          id: "contact1",
          displayName: "Alice Chen",
          name: "Alice Chen",
          publicKey: "ML-KEM-1024-pubkey-alice",
          signatureKey: "SLH-DSA-1024-pubkey-alice",
          created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: "online",
          lastMessage: "Have you tested the new key rotation feature?",
          lastMessageTime: new Date(Date.now() - 35 * 60 * 1000).toISOString()
        },
        {
          id: "contact2",
          displayName: "Bob Smith",
          name: "Bob Smith",
          publicKey: "ML-KEM-1024-pubkey-bob",
          signatureKey: "SLH-DSA-1024-pubkey-bob",
          created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: "offline",
          lastMessage: "We need to discuss the quantum-resistant TLS integration.",
          lastMessageTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      
      demoContacts.forEach(contact => saveContact(contact));
      loadedContacts = demoContacts;
    }
    
    setContacts(loadedContacts);
  }, []);

  // Filter contacts based on search query
  const filteredContacts = contacts.filter(contact => 
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle adding a new contact
  const handleAddContact = useCallback(() => {
    if (!newContactName.trim()) {
      toast({
        title: "Invalid Contact",
        description: "Please enter a valid contact name.",
        variant: "destructive",
      });
      return;
    }
    
    const contactId = crypto.randomUUID();
    
    const newContact: Contact = {
      id: contactId,
      displayName: newContactName,
      name: newContactName,
      publicKey: `ML-KEM-1024-pubkey-${contactId.substring(0, 8)}`,
      signatureKey: `SLH-DSA-1024-pubkey-${contactId.substring(0, 8)}`,
      created: new Date().toISOString(),
      status: "offline"
    };
    
    saveContact(newContact);
    setContacts(prevContacts => [...prevContacts, newContact]);
    setSelectedContact(newContact);
    
    setNewContactName('');
    setShowAddContact(false);
    
    toast({
      title: "Contact Added",
      description: `${newContactName} has been added to your contacts.`,
    });
  }, [newContactName, toast]);

  return (
    <MainLayout>
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Quantum-Secure Messaging</h1>
          </div>
          
          <Button 
            onClick={() => setShowAddContact(!showAddContact)} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Contact</span>
          </Button>
        </div>
        
        {showAddContact && (
          <Card className="p-4 mb-4">
            <h2 className="text-lg font-medium mb-4">Add New Contact</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Contact name"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleAddContact}>Add</Button>
              <Button variant="ghost" onClick={() => setShowAddContact(false)}>Cancel</Button>
            </div>
          </Card>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-10rem)]">
          <div className="md:col-span-1 border rounded-lg overflow-hidden flex flex-col h-full">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              {filteredContacts.length > 0 ? (
                <div className="divide-y">
                  {filteredContacts.map(contact => (
                    <div 
                      key={contact.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedContact?.id === contact.id ? 'bg-accent/20' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedContact(contact)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{contact.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{contact.name}</h3>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-4">
                  <Users className="h-8 w-8 text-muted-foreground mb-2" />
                  <h3 className="font-medium">No contacts found</h3>
                </div>
              )}
            </div>
          </div>
          
          <div className="md:col-span-2 border rounded-lg overflow-hidden h-full">
            {selectedContact ? (
              <Conversation 
                contact={selectedContact} 
                onBack={() => setSelectedContact(null)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <Shield className="h-16 w-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-medium mb-2">Select a contact to start messaging</h2>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Chat;
