/**
 * TetraCryptPQC Vault Dashboard
 * TOP SECRET//COSMIC//THAUMIEL
 */

import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import * as RadixUI from '@radix-ui/react-primitive';
import { cva, type VariantProps } from 'class-variance-authority';
import { vault } from '../../services/vault-service';
import { subscription } from '../../services/subscription-service';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

// Styles
const container = cva([
  'w-full',
  'max-w-7xl',
  'mx-auto',
  'px-4',
  'sm:px-6',
  'lg:px-8'
]);

const card = cva([
  'bg-white',
  'dark:bg-gray-800',
  'rounded-lg',
  'shadow-lg',
  'p-6'
]);

const button = cva([
  'inline-flex',
  'items-center',
  'px-4',
  'py-2',
  'border',
  'border-transparent',
  'text-sm',
  'font-medium',
  'rounded-md',
  'shadow-sm',
  'text-white',
  'bg-indigo-600',
  'hover:bg-indigo-700',
  'focus:outline-none',
  'focus:ring-2',
  'focus:ring-offset-2',
  'focus:ring-indigo-500'
]);

/**
 * File upload props
 */
interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
}

/**
 * File upload component
 */
const FileUpload: React.FC<FileUploadProps> = ({ onUpload }) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await onUpload(file);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center ${
        isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            await onUpload(file);
          }
        }}
      />
      <p className="text-gray-600">
        Drag and drop a file here, or click to select
      </p>
    </div>
  );
};

/**
 * File list props
 */
interface FileListProps {
  files: Array<{
    cid: string;
    filename: string;
    size: number;
    timestamp: string;
  }>;
  onDownload: (cid: string) => Promise<void>;
  onDelete: (cid: string) => Promise<void>;
}

/**
 * File list component
 */
const FileList: React.FC<FileListProps> = ({ files, onDownload, onDelete }) => {
  return (
    <div className="mt-8">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Filename
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Uploaded
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {files.map((file) => (
            <tr key={file.cid}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {file.filename}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatBytes(file.size)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(file.timestamp).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  className="text-indigo-600 hover:text-indigo-900 mr-4"
                  onClick={() => onDownload(file.cid)}
                >
                  Download
                </button>
                <button
                  className="text-red-600 hover:text-red-900"
                  onClick={() => onDelete(file.cid)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Storage usage props
 */
interface StorageUsageProps {
  used: number;
  total: number;
}

/**
 * Storage usage component
 */
const StorageUsage: React.FC<StorageUsageProps> = ({ used, total }) => {
  const percentage = Math.round((used / total) * 100);

  return (
    <div className="mt-8">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-600">
          {formatBytes(used)} of {formatBytes(total)} used
        </span>
        <span className="text-sm text-gray-600">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-indigo-600 h-2 rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Format bytes helper
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Vault dashboard component
 */
export const VaultDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Get files
  const { data: files, isLoading } = useQuery(['files', user?.id], async () => {
    // Implementation will get actual files
    return [];
  });

  // Get storage usage
  const { data: storage } = useQuery(['storage', user?.id], async () => {
    // Implementation will get actual storage usage
    return {
      used: 0,
      total: 100 * 1024 * 1024 // 100MB
    };
  });

  // Upload mutation
  const uploadMutation = useMutation(
    async (file: File) => {
      const buffer = await file.arrayBuffer();
      await vault.uploadFile(
        user!.id,
        new Uint8Array(buffer),
        file.name,
        'FREE'
      );
    },
    {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'File uploaded successfully',
          type: 'success'
        });
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: error.message,
          type: 'error'
        });
      }
    }
  );

  // Download mutation
  const downloadMutation = useMutation(
    async (cid: string) => {
      const result = await vault.downloadFile(user!.id, cid);
      
      // Create download link
      const blob = new Blob([result.file]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    {
      onError: (error) => {
        toast({
          title: 'Error',
          description: error.message,
          type: 'error'
        });
      }
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    async (cid: string) => {
      // Implementation will delete actual file
    },
    {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'File deleted successfully',
          type: 'success'
        });
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: error.message,
          type: 'error'
        });
      }
    }
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={container()}>
      <div className="py-10">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">
            TetraCryptPQC Vault
          </h1>
        </header>

        <main>
          <div className={card()}>
            <FileUpload onUpload={(file) => uploadMutation.mutate(file)} />

            {storage && (
              <StorageUsage used={storage.used} total={storage.total} />
            )}

            {files && files.length > 0 && (
              <FileList
                files={files}
                onDownload={(cid) => downloadMutation.mutate(cid)}
                onDelete={(cid) => deleteMutation.mutate(cid)}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
