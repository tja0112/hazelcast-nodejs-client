/*
 * Copyright (c) 2008-2018, Hazelcast, Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {PortableSerializer} from './PortableSerializer';
import {PositionalDataOutput} from '../Data';
import {ClassDefinition, FieldType, FieldDefinition} from './ClassDefinition';
import {BitsUtil} from '../../BitsUtil';
import {Portable} from '../Serializable';
import * as Long from 'long';

export class DefaultPortableWriter {
    private serializer: PortableSerializer;
    private output: PositionalDataOutput;
    private classDefinition: ClassDefinition;

    private offset: number;
    private begin: number;

    constructor(serializer: PortableSerializer, output: PositionalDataOutput, classDefinition: ClassDefinition) {
        this.serializer = serializer;
        this.output = output;
        this.classDefinition = classDefinition;
        this.begin = this.output.position();

        this.output.writeZeroBytes(4);
        this.output.writeInt(this.classDefinition.getFieldCount());
        this.offset = this.output.position();

        var fieldIndexesLength: number = (this.classDefinition.getFieldCount() + 1) * BitsUtil.INT_SIZE_IN_BYTES;
        this.output.writeZeroBytes(fieldIndexesLength);
    }

    writeInt(fieldName: string, value: number): void {
        this.setPosition(fieldName, FieldType.INT);
        this.output.writeInt(value);
    }

    writeLong(fieldName: string, long: Long): void {
        this.setPosition(fieldName, FieldType.LONG);
        this.output.writeLong(long);
    }

    writeUTF(fieldName: string, str: string): void {
        this.setPosition(fieldName, FieldType.UTF);
        this.output.writeUTF(str);
    }

    writeBoolean(fieldName: string, value: boolean): void {
        this.setPosition(fieldName, FieldType.BOOLEAN);
        this.output.writeBoolean(value);
    }

    writeByte(fieldName: string, value: number): void {
        this.setPosition(fieldName, FieldType.BYTE);
        this.output.writeByte(value);
    }

    writeChar(fieldName: string, char: string): void {
        this.setPosition(fieldName, FieldType.CHAR);
        this.output.writeChar(char);
    }

    writeDouble(fieldName: string, double: number): void {
        this.setPosition(fieldName, FieldType.DOUBLE);
        this.output.writeDouble(double);
    }

    writeFloat(fieldName: string, float: number): void {
        this.setPosition(fieldName, FieldType.FLOAT);
        this.output.writeFloat(float);
    }

    writeShort(fieldName: string, value: number): void {
        this.setPosition(fieldName, FieldType.SHORT);
        this.output.writeShort(value);
    }

    writePortable(fieldName: string, portable: Portable): void {
        var fieldDefinition = this.setPosition(fieldName, FieldType.PORTABLE);
        var isNullPortable = (portable == null);
        this.output.writeBoolean(isNullPortable);
        this.output.writeInt(fieldDefinition.getFactoryId());
        this.output.writeInt(fieldDefinition.getClassId());
        if (!isNullPortable) {
            this.serializer.writeObject(this.output, portable);
        }
    }

    writeNullPortable(fieldName: string, factoryId: number, classId: number): void {
        this.setPosition(fieldName, FieldType.PORTABLE);
        this.output.writeBoolean(true);
        this.output.writeInt(factoryId);
        this.output.writeInt(classId);
    }

    writeByteArray(fieldName: string, bytes: number[]): void {
        this.setPosition(fieldName, FieldType.BYTE_ARRAY);
        this.output.writeByteArray(bytes);
    }

    writeBooleanArray(fieldName: string, booleans: boolean[]): void {
        this.setPosition(fieldName, FieldType.BOOLEAN_ARRAY);
        this.output.writeBooleanArray(booleans);
    }

    writeCharArray(fieldName: string, chars: string[]): void {
        this.setPosition(fieldName, FieldType.CHAR_ARRAY);
        this.output.writeCharArray(chars);
    }

    writeIntArray(fieldName: string, ints: number[]): void {
        this.setPosition(fieldName, FieldType.INT_ARRAY);
        this.output.writeIntArray(ints);
    }

    writeLongArray(fieldName: string, longs: Long[]): void {
        this.setPosition(fieldName, FieldType.LONG_ARRAY);
        this.output.writeLongArray(longs);
    }

    writeDoubleArray(fieldName: string, doubles: number[]): void {
        this.setPosition(fieldName, FieldType.DOUBLE_ARRAY);
        this.output.writeDoubleArray(doubles);
    }

    writeFloatArray(fieldName: string, floats: number[]): void {
        this.setPosition(fieldName, FieldType.FLOAT_ARRAY);
        this.output.writeFloatArray(floats);
    }

    writeShortArray(fieldName: string, shorts: number[]): void {
        this.setPosition(fieldName, FieldType.SHORT_ARRAY);
        this.output.writeShortArray(shorts);
    }

    writeUTFArray(fieldName: string, val: string[]): void {
        this.setPosition(fieldName, FieldType.UTF_ARRAY);
        this.output.writeUTFArray(val);
    }

    writePortableArray(fieldName: string, portables: Portable[]): void {
        var innerOffset: number;
        var sample: Portable;
        var i: number;
        var fieldDefinition = this.setPosition(fieldName, FieldType.PORTABLE_ARRAY);
        var len = (portables == null ) ? BitsUtil.NULL_ARRAY_LENGTH : portables.length;
        this.output.writeInt(len);
        this.output.writeInt(fieldDefinition.getFactoryId());
        this.output.writeInt(fieldDefinition.getClassId());
        if (len > 0) {
            innerOffset = this.output.position();
            this.output.writeZeroBytes(len * 4);
            for (i = 0; i < len; i++) {
                sample = portables[i];
                var posVal = this.output.position();
                this.output.pwriteInt(innerOffset + i * BitsUtil.INT_SIZE_IN_BYTES, posVal);
                this.serializer.writeObject(this.output, sample);
            }
        }
    }

    end(): void {
        var position = this.output.position();
        this.output.pwriteInt(this.begin, position);
    }

    private setPosition(fieldName: string, fieldType: FieldType): FieldDefinition {
        var field: FieldDefinition = this.classDefinition.getField(fieldName);
        var pos: number = this.output.position();
        var index: number = field.getIndex();
        this.output.pwriteInt(this.offset + index * BitsUtil.INT_SIZE_IN_BYTES, pos);
        this.output.writeShort(fieldName.length);
        this.output.writeBytes(fieldName);
        this.output.writeByte(fieldType);
        return field;
    }
}
