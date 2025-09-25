'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Save, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Setting {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string;
  dataType: 'string' | 'number' | 'boolean' | 'json';
  isEditable: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GroupedSettings {
  [category: string]: Setting[];
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [groupedSettings, setGroupedSettings] = useState<GroupedSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('pricing');
  const [newSetting, setNewSetting] = useState({
    key: '',
    value: '',
    description: '',
    category: 'general',
    dataType: 'string' as const,
    isEditable: true
  });
  const [showNewSettingForm, setShowNewSettingForm] = useState(false);

  // Fetch settings from API
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.data.settings);
        setGroupedSettings(data.data.grouped);
      } else {
        toast.error('Failed to fetch settings');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Error fetching settings');
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Settings saved successfully');
        await fetchSettings(); // Refresh data
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  // Create new setting
  const createSetting = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSetting),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Setting created successfully');
        setNewSetting({
          key: '',
          value: '',
          description: '',
          category: 'general',
          dataType: 'string',
          isEditable: true
        });
        setShowNewSettingForm(false);
        await fetchSettings();
      } else {
        toast.error(data.error || 'Failed to create setting');
      }
    } catch (error) {
      console.error('Error creating setting:', error);
      toast.error('Error creating setting');
    }
  };

  // Delete setting
  const deleteSetting = async (key: string) => {
    if (!confirm('Are you sure you want to delete this setting?')) return;
    
    try {
      const response = await fetch(`/api/admin/settings?key=${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Setting deleted successfully');
        await fetchSettings();
      } else {
        toast.error(data.error || 'Failed to delete setting');
      }
    } catch (error) {
      console.error('Error deleting setting:', error);
      toast.error('Error deleting setting');
    }
  };

  // Update setting value
  const updateSettingValue = (key: string, value: string) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ));
  };

  // Update setting description
  const updateSettingDescription = (key: string, description: string) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, description } : setting
    ));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const categories = Object.keys(groupedSettings || {});
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">
            Configure application settings and pricing parameters
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchSettings}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={() => setShowNewSettingForm(true)}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Setting
          </Button>
          <Button
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* New Setting Form */}
      {showNewSettingForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Setting</CardTitle>
            <CardDescription>
              Create a new configuration setting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-key">Key</Label>
                <Input
                  id="new-key"
                  value={newSetting.key}
                  onChange={(e) => setNewSetting(prev => ({ ...prev, key: e.target.value }))}
                  placeholder="e.g., pricing.newRate"
                />
              </div>
              <div>
                <Label htmlFor="new-category">Category</Label>
                <Select
                  value={newSetting.category}
                  onValueChange={(value) => setNewSetting(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="pricing">Pricing</SelectItem>
                    <SelectItem value="property">Property</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="contact">Contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-value">Value</Label>
                <Input
                  id="new-value"
                  value={newSetting.value}
                  onChange={(e) => setNewSetting(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="Setting value"
                />
              </div>
              <div>
                <Label htmlFor="new-datatype">Data Type</Label>
                <Select
                  value={newSetting.dataType}
                  onValueChange={(value: any) => setNewSetting(prev => ({ ...prev, dataType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="new-description">Description</Label>
              <Textarea
                id="new-description"
                value={newSetting.description}
                onChange={(e) => setNewSetting(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this setting controls"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="new-editable"
                checked={newSetting.isEditable}
                onCheckedChange={(checked) => setNewSetting(prev => ({ ...prev, isEditable: checked }))}
              />
              <Label htmlFor="new-editable">Editable</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={createSetting}>Create Setting</Button>
              <Button
                variant="outline"
                onClick={() => setShowNewSettingForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          {categories.map(category => (
            <TabsTrigger key={category} value={category} className="capitalize">
              {category}
              <Badge variant="secondary" className="ml-2">
                {groupedSettings[category]?.length || 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map(category => (
          <TabsContent key={category} value={category}>
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">{category} Settings</CardTitle>
                <CardDescription>
                  Configure {category} related settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {groupedSettings[category]?.map(setting => (
                    <div key={setting.key} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label className="font-medium">{setting.key}</Label>
                          <Badge variant="outline">{setting.dataType}</Badge>
                          {!setting.isEditable && (
                            <Badge variant="destructive">Read Only</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSetting(setting.key)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`value-${setting.key}`}>Value</Label>
                          {setting.dataType === 'boolean' ? (
                            <div className="flex items-center space-x-2 mt-2">
                              <Switch
                                id={`value-${setting.key}`}
                                checked={setting.value === 'true'}
                                onCheckedChange={(checked) => 
                                  updateSettingValue(setting.key, checked.toString())
                                }
                                disabled={!setting.isEditable}
                              />
                              <Label htmlFor={`value-${setting.key}`}>
                                {setting.value === 'true' ? 'Enabled' : 'Disabled'}
                              </Label>
                            </div>
                          ) : setting.dataType === 'json' ? (
                            <Textarea
                              id={`value-${setting.key}`}
                              value={setting.value}
                              onChange={(e) => updateSettingValue(setting.key, e.target.value)}
                              disabled={!setting.isEditable}
                              className="font-mono text-sm"
                              rows={3}
                            />
                          ) : (
                            <Input
                              id={`value-${setting.key}`}
                              type={setting.dataType === 'number' ? 'number' : 'text'}
                              value={setting.value}
                              onChange={(e) => updateSettingValue(setting.key, e.target.value)}
                              disabled={!setting.isEditable}
                              step={setting.dataType === 'number' ? '0.01' : undefined}
                            />
                          )}
                        </div>
                        
                        <div>
                          <Label htmlFor={`desc-${setting.key}`}>Description</Label>
                          <Textarea
                            id={`desc-${setting.key}`}
                            value={setting.description || ''}
                            onChange={(e) => updateSettingDescription(setting.key, e.target.value)}
                            placeholder="Add description..."
                            rows={2}
                          />
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Last updated: {new Date(setting.updatedAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}