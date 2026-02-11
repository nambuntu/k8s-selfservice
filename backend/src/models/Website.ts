import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

// Website status enum
export enum WebsiteStatus {
  PENDING = 'pending',
  PROVISIONED = 'provisioned',
  FAILED = 'failed',
}

// Website attributes interface
export interface WebsiteAttributes {
  id: number;
  userId: string;
  websiteName: string;
  websiteTitle: string;
  htmlContent: string;
  status: WebsiteStatus;
  podIpAddress: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Optional fields for creation
export interface WebsiteCreationAttributes
  extends Optional<WebsiteAttributes, 'id' | 'status' | 'podIpAddress' | 'errorMessage' | 'createdAt' | 'updatedAt'> {}

// Website model class
export class Website extends Model<WebsiteAttributes, WebsiteCreationAttributes> implements WebsiteAttributes {
  public id!: number;
  public userId!: string;
  public websiteName!: string;
  public websiteTitle!: string;
  public htmlContent!: string;
  public status!: WebsiteStatus;
  public podIpAddress!: string | null;
  public errorMessage!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

// Initialize Website model
Website.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'user_id',
    },
    websiteName: {
      type: DataTypes.STRING(63),
      allowNull: false,
      unique: true,
      field: 'website_name',
      validate: {
        is: /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/,
      },
    },
    websiteTitle: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'website_title',
    },
    htmlContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'html_content',
      validate: {
        len: [1, 102400], // Max 100KB
      },
    },
    status: {
      type: DataTypes.ENUM(...Object.values(WebsiteStatus)),
      allowNull: false,
      defaultValue: WebsiteStatus.PENDING,
    },
    podIpAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'pod_ip_address',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'websites',
    timestamps: true,
    underscored: true,
  }
);

export default Website;
